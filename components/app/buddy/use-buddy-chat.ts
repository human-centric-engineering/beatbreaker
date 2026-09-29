'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { parseChatStreamEvent } from '@/components/admin/orchestration/chat/chat-events';
import type { Studio } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import {
  type ToolChange,
  decideApply,
  notesKey,
  readToolChange,
} from '@/lib/app/breaks/buddy/apply';
import { encodeBytes, findImportLink, importNote } from '@/lib/app/breaks/buddy/composer';
import { sharePayloadSchema, type SharePayload } from '@/lib/app/breaks/schema';
import { breakPayload } from '@/lib/app/breaks/share';
import { logger } from '@/lib/logging';
import { getUserFacingError } from '@/lib/orchestration/chat/error-messages';

/**
 * BeatBuddy's conversation, as the drawer runs it (tasks 7.12–7.13).
 *
 * A turn sends the message and the pattern on the stage to
 * `POST /api/v1/buddy/stream` and reads Sunrise's chat SSE back through
 * `parseChatStreamEvent`. Nothing here is the admin `ChatInterface`: the
 * body carries the working document, and the tool results are changes to
 * apply rather than cards to show (app-plan §6).
 *
 * **The apply loop** (7.13): each `capability_result` frame is read with
 * `readToolChange` (the document is held to `sharePayloadSchema` here too)
 * and judged by `decideApply`: newest rev only, and never over an edit the
 * drummer made since. The first change of a turn goes on the undo stack; later
 * ones replace it in place, so one Undo takes the turn back.
 *
 * **A failure stays in the drawer.** Nothing else in the Studio waits on
 * BeatBuddy, and every error here ends as a line in the transcript.
 */

export interface TurnChange {
  /** One line per change applied, in the order they landed. */
  summaries: string[];
  /** The notes on the stage right after the change — what makes Undo still mean it. */
  key: string;
  undone: boolean;
  /** Changes dropped because the drummer edited the pattern mid-turn. */
  dropped: number;
}

export interface BuddyMessage {
  id: string;
  /** `note` is the Studio speaking: something the composer opened. */
  role: 'user' | 'assistant' | 'note';
  text: string;
  /** Names of files sent with it. */
  files?: string[];
  change?: TurnChange;
  error?: string;
}

export interface BuddyFile {
  name: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';
  /** Base64, no data: prefix. */
  data: string;
}

const allowanceSchema = z.object({
  limit: z.number(),
  used: z.number(),
  remaining: z.number(),
  resetsAt: z.string(),
});
export type Allowance = z.infer<typeof allowanceSchema>;

const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

const importSchema = z.object({
  source: z.string(),
  doc: sharePayloadSchema,
  notes: z.array(z.string()),
});

/** What a turn keeps between frames. */
interface Turn {
  assistantId: string;
  /** Highest rev seen, applied or dropped. -1 until a change arrives. */
  rev: number;
  /** The notes BeatBuddy's next change is based on. */
  baseline: string;
  /** `studio.payload` as of the last apply: the same function means no render since. */
  payloadAt: Studio['payload'] | null;
  pushed: boolean;
}

let nextId = 0;
const newId = () => `m${++nextId}`;

export interface BuddyChat {
  messages: BuddyMessage[];
  busy: boolean;
  /** What the server says it is doing, while a turn runs. */
  status: string | null;
  allowance: Allowance | null;
  refreshAllowance: () => Promise<void>;
  send: (text: string, files?: BuddyFile[]) => Promise<void>;
  stop: () => void;
  importMidi: (file: File) => Promise<boolean>;
  canUndo: (m: BuddyMessage) => boolean;
  undoChange: (m: BuddyMessage) => void;
}

export function useBuddyChat(studio: Studio): BuddyChat {
  /* The stream outlives renders; it reads the Studio through a ref so every
     frame sees the stage as it is now, not as it was when the turn began. */
  const studioRef = useRef(studio);
  useEffect(() => {
    studioRef.current = studio;
  });

  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const conversationId = useRef<string | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  /** What the composer opened since the last turn, told to BeatBuddy with the next message. */
  const pendingNotes = useRef<string[]>([]);

  const patch = useCallback((id: string, fn: (m: BuddyMessage) => BuddyMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const refreshAllowance = useCallback(async () => {
    try {
      setAllowance(allowanceSchema.parse(await apiClient.get('/api/v1/buddy/allowance')));
    } catch (error) {
      logger.warn('BeatBuddy allowance could not be read', { error });
    }
  }, []);

  useEffect(() => () => abort.current?.abort(), []);

  /**
   * Put an imported document on the stage and say so in the transcript.
   * Returns the pattern as it now stands, because `studio.payload()` will not
   * see it until React renders.
   */
  const openImported = useCallback((label: string, doc: z.infer<typeof sharePayloadSchema>) => {
    const s = studioRef.current;
    const applied = breakPayload(s.applyAssistant(doc, true));
    const note = importNote(label, doc);
    pendingNotes.current.push(note);
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: 'note',
        text: `Opened ${label}`,
        change: {
          summaries: [note.slice(1, -1)],
          key: notesKey(applied),
          undone: false,
          dropped: 0,
        },
      },
    ]);
    return applied;
  }, []);

  /** A MIDI file, read by the import endpoint — chat attachments cannot carry MIDI. */
  const importMidi = useCallback(
    async (file: File): Promise<boolean> => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const got = importSchema.parse(
          await apiClient.post('/api/v1/breaks/import', {
            body: { kind: 'midi', data: encodeBytes(bytes), fileName: file.name },
          })
        );
        openImported(file.name, got.doc);
        return true;
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'That MIDI file could not be read.';
        setMessages((prev) => [...prev, { id: newId(), role: 'note', text: '', error: message }]);
        return false;
      }
    },
    [openImported]
  );

  const applyChanges = useCallback(
    (turn: Turn, changes: ToolChange[]) => {
      const s = studioRef.current;
      const current = s.payload === turn.payloadAt ? turn.baseline : notesKey(s.payload());
      const decision = decideApply(changes, {
        appliedRev: turn.rev,
        baseline: turn.baseline,
        current,
      });
      if (decision.kind === 'none') return;

      const landed = changes
        .filter((c) => c.rev > turn.rev && c.rev <= decision.change.rev)
        .sort((a, b) => a.rev - b.rev)
        .map((c) => c.summary);
      turn.rev = decision.change.rev;

      if (decision.kind === 'stale') {
        patch(turn.assistantId, (m) => ({
          ...m,
          change: {
            summaries: m.change?.summaries ?? [],
            key: m.change?.key ?? '',
            undone: false,
            dropped: (m.change?.dropped ?? 0) + landed.length,
          },
        }));
        return;
      }

      const applied = s.applyAssistant(decision.change.doc, !turn.pushed);
      turn.pushed = true;
      turn.baseline = notesKey(breakPayload(applied));
      turn.payloadAt = s.payload;
      patch(turn.assistantId, (m) => ({
        ...m,
        change: {
          summaries: [...(m.change?.summaries ?? []), ...landed],
          key: turn.baseline,
          undone: false,
          dropped: m.change?.dropped ?? 0,
        },
      }));
    },
    [patch]
  );

  const send = useCallback(
    async (text: string, files: BuddyFile[] = []) => {
      const message = text.trim();
      if (!message || busy) return;
      const s = studioRef.current;

      setBusy(true);
      setStatus(null);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'user',
          text: message,
          ...(files.length ? { files: files.map((f) => f.name) } : {}),
        },
      ]);

      /* A link the import endpoint reads goes on the stage first, and
         BeatBuddy is told what arrived. */
      const link = findImportLink(message);
      let imported: SharePayload | null = null;
      if (link) {
        try {
          const got = importSchema.parse(
            await apiClient.post('/api/v1/breaks/import', { body: { kind: 'text', text: link } })
          );
          imported = openImported(
            got.source === 'groove-scribe' ? 'the Groove Scribe link' : 'the BeatBreaker link',
            got.doc
          );
        } catch (error) {
          logger.info('BeatBuddy composer could not read a link', { error });
        }
      }

      // No render has happened since the import, so the studio still holds
      // the pattern from before it.
      const payload = imported ?? studioRef.current.payload();
      if (!payload) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            text: '',
            error: 'There is no pattern on the stage yet.',
          },
        ]);
        setBusy(false);
        return;
      }

      const outgoing = [...pendingNotes.current, message].join('\n');
      pendingNotes.current = [];
      const turn: Turn = {
        assistantId: newId(),
        rev: -1,
        baseline: notesKey(payload),
        // After an import the stage is about to change under this function;
        // null makes the first result compare against what is really there.
        payloadAt: imported ? null : studioRef.current.payload,
        pushed: false,
      };
      setMessages((prev) => [...prev, { id: turn.assistantId, role: 'assistant', text: '' }]);

      const fail = (error: string) => patch(turn.assistantId, (m) => ({ ...m, error }));
      const controller = new AbortController();
      abort.current = controller;

      try {
        const res = await fetch('/api/v1/buddy/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: outgoing,
            doc: payload,
            section: s.editing,
            ...(conversationId.current ? { conversationId: conversationId.current } : {}),
            ...(files.length ? { attachments: files } : {}),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const body = errorBodySchema.safeParse(await res.json().catch(() => null));
          if (body.success && body.data.error.code === 'BUDDY_ALLOWANCE_SPENT') {
            const spent = allowanceSchema.safeParse(body.data.error.details);
            if (spent.success) setAllowance(spent.data);
          }
          fail(body.success ? body.data.error.message : "BeatBuddy couldn't answer just now.");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let at: number;
          while ((at = buffer.indexOf('\n\n')) !== -1) {
            const event = parseChatStreamEvent(buffer.slice(0, at));
            buffer = buffer.slice(at + 2);
            if (!event) continue;
            switch (event.type) {
              case 'start':
                conversationId.current = event.conversationId;
                break;
              case 'content':
                patch(turn.assistantId, (m) => ({ ...m, text: m.text + event.delta }));
                break;
              case 'content_reset':
                patch(turn.assistantId, (m) => ({ ...m, text: '' }));
                break;
              case 'status':
                setStatus(event.message);
                break;
              case 'capability_result': {
                const change = readToolChange(event.capabilitySlug, event.result);
                if (change) applyChanges(turn, [change]);
                break;
              }
              case 'capability_results':
                applyChanges(
                  turn,
                  event.results.flatMap((r) => {
                    const change = readToolChange(r.capabilitySlug, r.result);
                    return change ? [change] : [];
                  })
                );
                break;
              case 'error':
                fail(getUserFacingError(event.code).message);
                break;
              case 'budget_exceeded_per_turn':
                fail(event.message);
                break;
              default:
                break;
            }
          }
        }
      } catch (error) {
        if (controller.signal.aborted) {
          fail('Stopped.');
        } else {
          logger.warn('BeatBuddy turn failed', { error });
          fail("BeatBuddy couldn't answer just now. Everything else in the Studio still works.");
        }
      } finally {
        abort.current = null;
        setBusy(false);
        setStatus(null);
        void refreshAllowance();
      }
    },
    [busy, openImported, applyChanges, patch, refreshAllowance]
  );

  const stop = useCallback(() => abort.current?.abort(), []);

  /** Whether the chip's Undo still means that change: nothing has been edited since. */
  const canUndo = useCallback(
    (m: BuddyMessage) =>
      !!m.change &&
      !m.change.undone &&
      m.change.summaries.length > 0 &&
      studio.canUndo &&
      notesKey(studio.payload()) === m.change.key,
    [studio]
  );

  const undoChange = useCallback(
    (m: BuddyMessage) => {
      if (!canUndo(m)) return;
      studio.undo();
      patch(m.id, (x) => (x.change ? { ...x, change: { ...x.change, undone: true } } : x));
    },
    [canUndo, studio, patch]
  );

  return {
    messages,
    busy,
    status,
    allowance,
    refreshAllowance,
    send,
    stop,
    importMidi,
    canUndo,
    undoChange,
  };
}
