'use client';

import { Paperclip, Send, Square, Undo2, X } from 'lucide-react';
import Link from 'next/link';
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import type { BuddyChat, BuddyFile, BuddyMessage } from '@/components/app/buddy/use-buddy-chat';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { SUGGESTED_PROMPTS, encodeBytes, isMidiFile } from '@/lib/app/breaks/buddy/composer';

/**
 * The BeatBuddy drawer (task 7.12): the conversation, a composer that takes
 * photos, PDFs and MIDI files, suggested prompts to start from, a change chip
 * with Undo under every reply that changed the chart, and the day's allowance.
 *
 * Purpose-built rather than the admin `ChatInterface` (app-plan §6). The
 * turn itself is `useBuddyChat`; this is only what you see.
 */

/** Longest side of a photo, after downscaling. Plenty for notation, and a fraction of the upload. */
const IMAGE_EDGE = 1600;
/** A PDF over this is not a drum chart. The attachment limit is ~5.6 MB. */
const PDF_MAX_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

function isImageType(type: string): type is ImageType {
  return (IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * A photo, shrunk to {@link IMAGE_EDGE} on its longest side and sent as JPEG.
 * Where the browser cannot draw it (no canvas), it goes as it is.
 */
async function readImage(file: File, type: ImageType): Promise<BuddyFile> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', 0.85);
    return { name: file.name, mediaType: 'image/jpeg', data: url.slice(url.indexOf(',') + 1) };
  } catch {
    return {
      name: file.name,
      mediaType: type,
      data: encodeBytes(new Uint8Array(await file.arrayBuffer())),
    };
  }
}

function Meter({ remaining, limit }: { remaining: number; limit: number }) {
  return (
    <div className="buddy-meter">
      <span>
        {remaining} of {limit} turns left today
      </span>
      <span className="buddy-meter-bar" aria-hidden="true">
        <i style={{ width: `${Math.round((remaining / Math.max(1, limit)) * 100)}%` }} />
      </span>
    </div>
  );
}

function ChangeChip({
  message,
  canUndo,
  onUndo,
}: {
  message: BuddyMessage;
  canUndo: boolean;
  onUndo: () => void;
}) {
  const change = message.change;
  if (!change) return null;
  return (
    <>
      {change.summaries.length > 0 ? (
        <div className="buddy-chip">
          <ul>
            {change.summaries.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {change.undone ? (
            <span className="buddy-chip-done">Undone</span>
          ) : (
            <button type="button" className="mini" onClick={onUndo} disabled={!canUndo}>
              <Undo2 size={14} /> Undo
            </button>
          )}
        </div>
      ) : null}
      {change.dropped > 0 ? (
        <p className="buddy-dropped">
          You changed the pattern while BeatBuddy was working, so{' '}
          {change.dropped === 1 ? 'its change was' : `${change.dropped} changes were`} not applied.
        </p>
      ) : null}
    </>
  );
}

export function BuddyPanel({ chat }: { chat: BuddyChat }) {
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<BuddyFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);

  const spent = chat.allowance?.remaining === 0;

  /* Read when the drawer opens, not when the Studio does: most visits never
     open BeatBuddy, and the count moves only when a turn is taken. */
  const { refreshAllowance } = chat;
  useEffect(() => {
    void refreshAllowance();
  }, [refreshAllowance]);

  /* Follow the conversation as it grows, as a chat does. */
  const last = chat.messages[chat.messages.length - 1];
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, last?.text, last?.change]);

  const submit = (text = draft) => {
    if (!text.trim() || chat.busy || spent) return;
    void chat.send(text, files);
    setDraft('');
    setFiles([]);
    setFileError(null);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    setFileError(null);
    for (const file of picked) {
      if (isMidiFile(file)) {
        await chat.importMidi(file);
      } else if (isImageType(file.type)) {
        const read = await readImage(file, file.type);
        setFiles((prev) => [...prev, read]);
      } else if (file.type === 'application/pdf') {
        if (file.size > PDF_MAX_BYTES) {
          setFileError(`${file.name} is over 5 MB.`);
          continue;
        }
        const data = encodeBytes(new Uint8Array(await file.arrayBuffer()));
        setFiles((prev) => [...prev, { name: file.name, mediaType: 'application/pdf', data }]);
      } else {
        setFileError(`BeatBuddy reads photos, PDFs and MIDI files — not ${file.name}.`);
      }
    }
  };

  return (
    <div className="buddy">
      {chat.allowance ? (
        <Meter remaining={chat.allowance.remaining} limit={chat.allowance.limit} />
      ) : null}

      <div className="buddy-log" ref={log} role="log" aria-live="polite" aria-label="Conversation">
        {chat.messages.length === 0 ? (
          <div className="buddy-empty">
            <p>Ask for a change in words and watch the chart. Every change can be undone.</p>
            <div className="buddy-prompts">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="mini"
                  onClick={() => submit(p)}
                  disabled={chat.busy || spent}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.messages.map((m) => (
            <div key={m.id} className={`buddy-msg buddy-${m.role}`}>
              {m.text ? <p className="buddy-text">{m.text}</p> : null}
              {m.files?.length ? <p className="buddy-files">{m.files.join(', ')}</p> : null}
              <ChangeChip message={m} canUndo={chat.canUndo(m)} onUndo={() => chat.undoChange(m)} />
              {m.error ? (
                <p className="buddy-error" role="alert">
                  {m.error}
                </p>
              ) : null}
            </div>
          ))
        )}
        {chat.busy ? <p className="buddy-status">{chat.status ?? 'Working on it…'}</p> : null}
      </div>

      {spent ? (
        <p className="buddy-spent" role="status">
          That&apos;s all of today&apos;s turns. They come back at midnight UTC — everything else in
          the Studio still works.
        </p>
      ) : null}

      <form
        className="buddy-composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {files.length || fileError ? (
          <div className="buddy-attached">
            {files.map((f, i) => (
              <span key={i} className="chip">
                {f.name}
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {fileError ? <span className="buddy-error">{fileError}</span> : null}
          </div>
        ) : null}
        <label className="sr-only" htmlFor="buddy-input">
          Message BeatBuddy
        </label>
        <textarea
          id="buddy-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          rows={2}
          maxLength={4000}
          placeholder="Ask BeatBuddy…"
          disabled={spent}
        />
        <div className="buddy-actions">
          <input
            ref={picker}
            type="file"
            hidden
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.mid,.midi,audio/midi"
            onChange={(e) => void onPick(e)}
          />
          <button
            type="button"
            className="mini"
            onClick={() => picker.current?.click()}
            disabled={chat.busy || spent}
            aria-label="Attach a photo, PDF or MIDI file"
          >
            <Paperclip size={14} />
          </button>
          <StudioHelp title="Attaching">
            A photo or PDF of notation goes to BeatBuddy to transcribe. A MIDI file, a BeatBreaker
            link or a Groove Scribe link is opened on the chart straight away, and BeatBuddy is told
            what arrived. Other web pages are not fetched.
          </StudioHelp>
          <span className="spacer" />
          {chat.busy ? (
            <button type="button" className="mini" onClick={chat.stop}>
              <Square size={14} /> Stop
            </button>
          ) : (
            <button type="submit" className="mini on" disabled={!draft.trim() || spent}>
              <Send size={14} /> Send
            </button>
          )}
        </div>
        <p className="buddy-small">
          Messages go to a model provider. <Link href="/privacy">Privacy policy</Link>
        </p>
      </form>
    </div>
  );
}
