import { z } from 'zod';

import type { KitSlotSettings } from '@/lib/app/breaks/kit';
import { KIT_CREDITS } from '@/lib/app/breaks/kit-credits.generated';
import type { LaneKey } from '@/lib/app/breaks/types';
import type { YourKitSlotInput, YourKitSlotView, YourKitView } from '@/lib/validations/samples';

/**
 * Building a kit of your own from pieces (9.18): what the Kit drawer's builder
 * shows and what it sends, without the drawer.
 *
 * **The builder works by row, not by slot.** A row is a piece's role in the
 * kit: the snare row is the snare with its ghost, cross-stick and rimshot.
 * Choosing a piece fills each of the row's slots that it has and empties the
 * rest, which then fall back or play synthesised, as a pack's do. The knobs on
 * a row write each of its filled slots, and its pan writes its lane.
 */

export interface BuilderRow {
  id: string;
  label: string;
  /** Which pieces it offers: a `KitPiece` role. */
  role: string;
  /** Its slots, the one a piece is heard by first. */
  slots: string[];
  /** The lanes its Pan writes. None for a row that shares another's. */
  lanes: LaneKey[];
}

export const BUILDER_ROWS: BuilderRow[] = [
  { id: 'kick', label: 'Kick', role: 'kick', slots: ['k'], lanes: ['k'] },
  {
    id: 'snare',
    label: 'Snare',
    role: 'snare',
    slots: ['s', 'sGhost', 'sCross', 'sRim'],
    lanes: ['s'],
  },
  // the foot is the same hats, so it pans with them
  {
    id: 'hats',
    label: 'Hats',
    role: 'hat',
    slots: ['h', 'hOpen', 'hHalf', 'hFoot'],
    lanes: ['h', 'hf'],
  },
  { id: 'ride', label: 'Ride', role: 'ride', slots: ['r', 'rBell'], lanes: ['r'] },
  { id: 'crash', label: 'Crash', role: 'crash', slots: ['c', 'c2', 'cChina'], lanes: ['c'] },
  // a splash plays on the crash's lane, so the crash row's Pan is its pan too
  { id: 'splash', label: 'Splash', role: 'crash', slots: ['cSplash'], lanes: [] },
  { id: 't1', label: 'High tom', role: 'tom', slots: ['t1'], lanes: ['t1'] },
  { id: 't2', label: 'Mid tom', role: 'tom', slots: ['t2'], lanes: ['t2'] },
  { id: 't3', label: 'Floor tom', role: 'tom', slots: ['t3'], lanes: ['t3'] },
];

/** One slot of a piece as `/api/v1/catalogue/pieces` serves it. */
const pieceSlotSchema = z.object({
  layers: z.array(z.object({ velocity: z.number(), urls: z.array(z.string()).min(1) })).min(1),
  trim: z.number(),
});

/** A piece as `/api/v1/catalogue/pieces` serves it: read back through this, as external data. */
export const pieceViewSchema = z.object({
  key: z.string(),
  label: z.string(),
  role: z.string(),
  source: z.string(),
  credit: z.string().nullable(),
  // a piece with nothing to play would empty the row it was chosen for
  slots: z
    .record(z.string(), pieceSlotSchema)
    .refine((slots) => Object.keys(slots).length > 0, 'a piece fills at least one slot'),
});
export type PieceView = z.infer<typeof pieceViewSchema>;

export const pieceListSchema = z.array(pieceViewSchema);

export interface PieceGroup {
  /** The source's title: "Big Rusty Drums". */
  label: string;
  pieces: PieceView[];
}

const SOURCE_TITLE = new Map(KIT_CREDITS.map((c) => [c.id, c.title]));

/** The pieces a row offers, grouped by the library they were recorded from, in catalogue order. */
export function pieceGroups(pieces: PieceView[], row: BuilderRow): PieceGroup[] {
  const groups = new Map<string, PieceGroup>();
  for (const piece of pieces) {
    if (piece.role !== row.role) continue;
    let group = groups.get(piece.source);
    if (!group) {
      group = { label: SOURCE_TITLE.get(piece.source) ?? piece.source, pieces: [] };
      groups.set(piece.source, group);
    }
    group.pieces.push(piece);
  }
  return [...groups.values()];
}

/** A slot's Level, Tune and Decay, with the ones at their defaults left out. */
export function settingsOf(v: KitSlotSettings): KitSlotSettings {
  const out: KitSlotSettings = {};
  if (v.level !== undefined && v.level !== 1) out.level = v.level;
  if (v.tune !== undefined && v.tune !== 0) out.tune = v.tune;
  if (v.decay !== undefined && v.decay !== 1) out.decay = v.decay;
  return out;
}

/** What a filled slot of your kit is, as a `PATCH` gives it back, with these settings. */
function asInput(slot: YourKitSlotView, settings: KitSlotSettings): YourKitSlotInput {
  if ('sampleId' in slot) return { sample: slot.sampleId, ...settingsOf(settings) };
  return { piece: slot.piece, ...(slot.from ? { from: slot.from } : {}), ...settingsOf(settings) };
}

/** What is in a row now: the slot it is heard by, and its settings. */
export interface RowNow {
  /** The row's first filled slot, or nothing if the row is empty. */
  slot?: string;
  entry?: YourKitSlotView;
  /** The piece in that slot, if it is a piece. */
  piece?: string;
  settings: Required<KitSlotSettings>;
}

export function rowNow(kit: YourKitView, row: BuilderRow): RowNow {
  const slot = row.slots.find((s) => kit.slots[s]);
  const entry = slot ? kit.slots[slot] : undefined;
  return {
    slot,
    entry,
    piece: entry && 'piece' in entry ? entry.piece : undefined,
    settings: {
      level: entry?.level ?? 1,
      tune: entry?.tune ?? 0,
      decay: entry?.decay ?? 1,
    },
  };
}

/**
 * The `slots` a `PATCH` needs to put `piece` in `row`: each of the row's slots
 * the piece has, and `null` for the rest. A piece with none of them (a tom on
 * another tom, a crash as the splash) fills the row's first slot
 * with its own first. The row's settings carry over. `null` for the piece
 * empties the row.
 */
export function fillRow(
  row: BuilderRow,
  piece: PieceView | null,
  settings: KitSlotSettings = {}
): Record<string, YourKitSlotInput | null> {
  const out: Record<string, YourKitSlotInput | null> = {};
  const kept = settingsOf(settings);
  const has = piece ? row.slots.filter((s) => piece.slots[s]) : [];
  for (const slot of row.slots) {
    out[slot] = piece && has.includes(slot) ? { piece: piece.key, ...kept } : null;
  }
  const first = piece ? Object.keys(piece.slots)[0] : undefined;
  if (piece && !has.length && first) {
    out[row.slots[0]] = { piece: piece.key, from: first, ...kept };
  }
  return out;
}

/** The `slots` a `PATCH` needs to give each filled slot of `row` these settings. */
export function rowSettings(
  kit: YourKitView,
  row: BuilderRow,
  settings: KitSlotSettings
): Record<string, YourKitSlotInput> {
  const out: Record<string, YourKitSlotInput> = {};
  for (const slot of row.slots) {
    const entry = kit.slots[slot];
    if (entry) out[slot] = asInput(entry, settings);
  }
  return out;
}

/** The row's pan as the drummer hears it, or `undefined` where the kit takes the default. */
export function rowPan(kit: YourKitView, row: BuilderRow): number | undefined {
  const lane = row.lanes[0];
  return lane ? kit.pan?.[lane] : undefined;
}

/** What a tap on a piece plays: its loudest take of the slot the row is heard by. */
export interface Preview {
  url: string;
  trim: number;
  /** The take's layer: its loudness as an amplitude, which its gain is measured against. */
  velocity: number;
}

export function previewOf(piece: PieceView, row: BuilderRow): Preview | null {
  const slot = row.slots.find((s) => piece.slots[s]) ?? Object.keys(piece.slots)[0];
  const spec = slot ? piece.slots[slot] : undefined;
  if (!spec) return null;
  const loudest = spec.layers.reduce((a, b) => (b.velocity > a.velocity ? b : a));
  return { url: loudest.urls[0], trim: spec.trim, velocity: loudest.velocity };
}
