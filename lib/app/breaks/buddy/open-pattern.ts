import { z } from 'zod';

import { SECTIONS } from '@/lib/app/breaks/buddy/describe';
import { type EditData, describeEdit, editWorkspace } from '@/lib/app/breaks/buddy/edit';
import { maxBpm } from '@/lib/app/breaks/audio/transport';
import { listLibraries, listStyles, styleLookup } from '@/lib/app/breaks/catalogue/data';
import { openableIdForSlug } from '@/lib/app/breaks/community/public';
import { slugSchema } from '@/lib/app/breaks/community/visibility';
import { deriveB } from '@/lib/app/breaks/generate';
import { clonePattern } from '@/lib/app/breaks/pattern';
import { openSavedBreak } from '@/lib/app/breaks/saved/data';
import { type BreakDoc, breakDocFromPayload, patternFromPacked } from '@/lib/app/breaks/share';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `open_pattern` — load a saved pattern, a famous break, or a `/p/` link into
 * the workspace, replacing what was open.
 *
 * **Reads only what the caller could open anyway.** A saved pattern goes
 * through `openSavedBreak()`, the read the Studio's `/studio/[id]` page uses:
 * the caller's own, or one shared by link or published. Someone else's private
 * pattern and an id that was never saved are the same `not_found`. A `/p/`
 * link resolves through `openableIdForSlug()`, which only knows shared and
 * published rows.
 *
 * The workspace holds a copy. Nothing here writes to the pattern it opened,
 * and `mine` tells the Studio whether saving should update it or save a copy.
 */

const schema = z
  .object({
    source: z.enum(['mine', 'published', 'library']).optional(),
    id: z.string().min(1).max(64).optional(),
    link: z.string().trim().max(300).optional(),
  })
  .refine((a) => (a.link ? !a.id : !!a.id && !!a.source), {
    message: 'Give a source and an id from find_patterns, or a link',
  });

type Args = z.infer<typeof schema>;

export interface OpenPatternData extends EditData {
  opened: {
    source: 'saved' | 'library';
    id: string;
    title: string;
    /** True when the caller owns it — saving can update it rather than copy it. */
    mine: boolean;
  };
}

/** A `/p/<slug>` address, a full URL to one, or the bare slug. */
function slugOf(link: string): string | null {
  const m = /(?:^|\/p\/)([0-9a-z]{6,16})\/?(?:[?#].*)?$/.exec(link);
  const parsed = slugSchema.safeParse(m?.[1]);
  return parsed.success ? parsed.data : null;
}

type Loaded =
  | { ok: true; load: (current: BreakDoc) => BreakDoc; opened: OpenPatternData['opened'] }
  | { ok: false; message: string; code: string };

const NOT_FOUND = {
  ok: false,
  message: 'There is no pattern there that you can open',
  code: 'not_found',
} as const;

async function loadSaved(id: string, userId: string): Promise<Loaded> {
  const found = await openSavedBreak(id, userId);
  if (!found) return NOT_FOUND;
  const doc = breakDocFromPayload(found.payload, styleLookup(await listStyles()));
  return {
    ok: true,
    load: () => doc,
    opened: { source: 'saved', id: found.row.id, title: found.row.title, mine: found.mine },
  };
}

/** A famous break, opened the way the Studio's library picker opens one. */
async function loadLibrary(id: string): Promise<Loaded> {
  const [libraries, styles] = await Promise.all([listLibraries(), listStyles()]);
  const entry = libraries.flatMap((l) => l.entries).find((e) => e.id === id);
  if (!entry) return NOT_FOUND;

  const lookup = styleLookup(styles);
  const A = patternFromPacked(entry.doc, lookup);
  const params = lookup(entry.styleKey)?.params;
  const B = params ? deriveB(A, params) : clonePattern(A);
  B.name = `${entry.title} (B)`;
  return {
    ok: true,
    load: (current) => ({
      ...current,
      bpm: Math.min(Math.max(Math.round(entry.bpm), 50), maxBpm(A.meter)),
      A,
      B,
    }),
    opened: { source: 'library', id: entry.id, title: entry.title, mine: false },
  };
}

export class OpenPatternCapability extends BaseCapability<Args, OpenPatternData> {
  readonly slug = 'open_pattern';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'open_pattern',
    description:
      "Open a pattern in the Studio, replacing the one open now (the user can undo). Give the source and id from find_patterns, or a BeatBreaker pattern link (…/p/abc123). Opening someone else's pattern opens a copy. Returns the opened pattern as text.",
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['mine', 'published', 'library'],
          description: 'Where find_patterns found it.',
        },
        id: { type: 'string', description: 'The id find_patterns returned.' },
        link: { type: 'string', description: 'A BeatBreaker /p/ link, instead of source and id.' },
      },
    },
  };

  protected readonly schema = schema;

  async execute(
    args: Args,
    context: CapabilityContext
  ): Promise<CapabilityResult<OpenPatternData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');
    const userId = context.userId;

    let loaded: Loaded;
    if (args.link) {
      const slug = slugOf(args.link);
      const id = slug ? await openableIdForSlug(slug) : null;
      loaded = id ? await loadSaved(id, userId) : NOT_FOUND;
    } else if (args.source === 'library') {
      loaded = await loadLibrary(args.id ?? '');
    } else {
      loaded = await loadSaved(args.id ?? '', userId);
    }
    if (!loaded.ok) return this.error(loaded.message, loaded.code);

    const { load, opened } = loaded;
    const outcome = await editWorkspace(userId, (doc) => ({
      ok: true,
      doc: load(doc),
      extra: null,
    }));
    if (!outcome.ok) return this.error(outcome.message, outcome.code);

    return this.success({
      doc: outcome.payload,
      rev: outcome.rev,
      summary: `Opened ${opened.title}${opened.mine ? '' : ' (a copy)'}`,
      ...describeEdit(outcome.before, outcome.after, SECTIONS),
      opened,
    });
  }
}
