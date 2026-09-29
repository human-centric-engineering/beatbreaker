import { z } from 'zod';

import { type SharePayload, sharePayloadSchema } from '@/lib/app/breaks/schema';

/**
 * Which of BeatBuddy's tool results the Studio applies (task 7.13).
 *
 * **Client-safe and pure**: the drawer calls these as `capability_result`
 * frames arrive. The rules, from Spike B (`.context/app/beatbuddy.md`):
 *
 * - **A result is untrusted until it parses.** The frame's `result` is
 *   `unknown`; only one that carries a document passing `sharePayloadSchema`,
 *   a rev and a summary is a change. A failed call carries no document.
 * - **The highest rev wins, and only once.** A `capability_results` frame
 *   lists calls in the order they were made, not the order they finished, so
 *   the last entry is not necessarily the newest document. A rev at or below
 *   the one already applied is old news.
 * - **A result older than a manual edit is dropped.** The turn's baseline is
 *   the pattern the Studio sent, and then each document it applied. If the
 *   notes on the stage no longer match the baseline, the drummer has edited
 *   since, and applying BeatBuddy's document would silently undo that edit.
 */

const toolChangeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    doc: sharePayloadSchema,
    rev: z.number().int().min(0),
    summary: z.string().max(300),
  }),
});

export interface ToolChange {
  tool: string;
  doc: SharePayload;
  rev: number;
  summary: string;
}

/** A tool result as a change to apply, or null when it carries none. */
export function readToolChange(tool: string, result: unknown): ToolChange | null {
  const parsed = toolChangeSchema.safeParse(result);
  if (!parsed.success) return null;
  return { tool, ...parsed.data.data };
}

/** The newest change in a batch, if it is newer than `appliedRev`. */
export function newestChange(changes: ToolChange[], appliedRev: number): ToolChange | null {
  let best: ToolChange | null = null;
  for (const change of changes) {
    if (change.rev > appliedRev && (!best || change.rev > best.rev)) best = change;
  }
  return best;
}

/**
 * The notes of a document, as a comparable string: both sections, nothing
 * else. Tempo, swing and layer are left out on purpose — practising at 80%
 * while BeatBuddy works is not an edit to the pattern.
 */
export function notesKey(payload: SharePayload | null): string {
  return payload ? JSON.stringify([payload.A, payload.B]) : '';
}

export type ApplyDecision =
  | { kind: 'apply'; change: ToolChange }
  /** The drummer edited the pattern after the baseline; nothing is applied. */
  | { kind: 'stale'; change: ToolChange }
  | { kind: 'none' };

/**
 * What to do with the changes one frame carried.
 *
 * @param baseline `notesKey` of the pattern BeatBuddy's change is based on.
 * @param current `notesKey` of the pattern on the stage now.
 */
export function decideApply(
  changes: ToolChange[],
  state: { appliedRev: number; baseline: string; current: string }
): ApplyDecision {
  const change = newestChange(changes, state.appliedRev);
  if (!change) return { kind: 'none' };
  if (state.current !== state.baseline) return { kind: 'stale', change };
  return { kind: 'apply', change };
}
