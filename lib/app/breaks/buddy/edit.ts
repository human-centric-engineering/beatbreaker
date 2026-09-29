import {
  type Section,
  type SectionView,
  changedBars,
  viewSection,
} from '@/lib/app/breaks/buddy/describe';
import { readWorkspace, writeWorkspace } from '@/lib/app/breaks/buddy/workspace';
import { listStyles, styleLookup } from '@/lib/app/breaks/catalogue/data';
import type { CatalogueStyle } from '@/lib/app/breaks/catalogue/types';
import { type SharePayload, sharePayloadSchema } from '@/lib/app/breaks/schema';
import { type BreakDoc, breakDocFromPayload, breakPayload } from '@/lib/app/breaks/share';

/**
 * One edit to the caller's workspace, the way every mutating BeatBuddy tool
 * makes one: read, change, hold to `sharePayloadSchema`, write if nobody
 * wrote since the read.
 *
 * **A write that loses the race is made again** (Spike B, `beatbuddy.md`). A
 * model puts several tool calls in one response, Sunrise runs them at once,
 * and of two writes from the same rev one loses. Every edit here is "make this
 * change to the pattern as it stands", so the loser re-reads and applies its
 * change to what is there now. Two edits in one batch then both land, in an
 * order nobody promised. After {@link WRITE_ATTEMPTS} losses it reports
 * `workspace_changed` and the model tells the drummer.
 */

export const WRITE_ATTEMPTS = 3;

export interface SectionChange {
  section: Section;
  /** 1-based. Empty when the edit found nothing to change. */
  bars: number[];
}

/**
 * What every mutating tool returns. `doc` and `rev` are what the Studio
 * applies; the drawer shows `summary` on the change chip; the model reads
 * `sections`.
 */
export interface EditData {
  /** The whole new document. */
  doc: SharePayload;
  rev: number;
  /** One sentence for the change chip. */
  summary: string;
  changes: SectionChange[];
  /** The sections the edit touched, as they read now. */
  sections: SectionView[];
}

export interface EditTools {
  /** A style from the catalogue, live — what an edit that writes new notes needs. */
  style: (key: string) => CatalogueStyle | undefined;
  styles: CatalogueStyle[];
}

export type EditStep<T> =
  { ok: true; doc: BreakDoc; extra: T } | { ok: false; message: string; code: string };

export type EditOutcome<T> =
  | { ok: true; before: BreakDoc; after: BreakDoc; payload: SharePayload; rev: number; extra: T }
  | { ok: false; message: string; code: string };

/**
 * Apply `edit` to the caller's workspace and write the result.
 *
 * `edit` may run more than once — once per attempt, each time on the newest
 * document — so it must not have effects of its own beyond returning the new
 * document.
 */
export async function editWorkspace<T>(
  userId: string,
  edit: (doc: BreakDoc, tools: EditTools) => EditStep<T> | Promise<EditStep<T>>
): Promise<EditOutcome<T>> {
  const styles = await listStyles();
  const lookup = styleLookup(styles);
  const byKey = new Map(styles.map((s) => [s.key, s]));
  const tools: EditTools = { style: (key) => byKey.get(key), styles };

  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
    const workspace = await readWorkspace(userId);
    if (!workspace) {
      return { ok: false, message: 'No pattern is open in the Studio yet', code: 'no_workspace' };
    }

    const before = breakDocFromPayload(workspace.doc, lookup);
    const step = await edit(before, tools);
    if (!step.ok) return step;

    const parsed = sharePayloadSchema.safeParse(breakPayload(step.doc));
    if (!parsed.success) {
      return {
        ok: false,
        message: 'That change produced a pattern the Studio cannot read',
        code: 'invalid_result',
      };
    }

    const written = await writeWorkspace(userId, parsed.data, workspace.rev);
    if (written) {
      return {
        ok: true,
        before,
        after: step.doc,
        payload: written.doc,
        rev: written.rev,
        extra: step.extra,
      };
    }
  }

  return {
    ok: false,
    message: 'The pattern kept changing while this ran, so nothing was changed. Try again',
    code: 'workspace_changed',
  };
}

/** The bars that changed in each of `sections`, and how those sections read now. */
export function describeEdit(
  before: BreakDoc,
  after: BreakDoc,
  sections: readonly Section[]
): { changes: SectionChange[]; sections: SectionView[] } {
  return {
    changes: sections.map((section) => ({
      section,
      bars: changedBars(before[section], after[section]),
    })),
    sections: sections.map((s) => viewSection(after[s], s, after.bpm, after.swing)),
  };
}

/** "A bars 1, 2; nothing to change in B" — the change chip's second half. */
export function barsSummary(changes: SectionChange[]): string {
  return changes
    .map(({ section, bars }) =>
      bars.length === 0
        ? `nothing to change in ${section}`
        : `${section} bar${bars.length > 1 ? 's' : ''} ${bars.join(', ')}`
    )
    .join('; ');
}
