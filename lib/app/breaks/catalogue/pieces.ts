import type {
  KitSampleSlot,
  KitSamples,
  KitSlotSettings,
  KitStoredSamples,
  KitStoredSlot,
} from '@/lib/app/breaks/kit';

/**
 * Pieces (Phase 9-v): one instrument from one source, and the slots it fills.
 *
 * Pure, so the catalogue resolves a system kit's piece map and your kits
 * resolve theirs the same way, and the tests read it without a database.
 */

/** A piece as the catalogue serves it. */
export interface CataloguePiece {
  key: string;
  label: string;
  /** "kick" | "snare" | "tom" | "hat" | "ride" | "crash". */
  role: string;
  /** The library it was recorded from. */
  source: string;
  /** The folder under `/kits/` its files are in. */
  folder: string;
  /** Slot → its recordings. */
  slots: Record<string, KitSampleSlot>;
  credit?: string;
}

/** The settings a stored slot carries, and nothing else. */
function settingsOf(slot: KitSlotSettings): KitSlotSettings {
  const out: KitSlotSettings = {};
  if (slot.level !== undefined) out.level = slot.level;
  if (slot.tune !== undefined) out.tune = slot.tune;
  if (slot.decay !== undefined) out.decay = slot.decay;
  return out;
}

/**
 * One stored slot as playback reads it, or `null` where it names a piece, or
 * a slot of one, that is not there.
 *
 * - `{ piece, from? }` is the piece's recordings of `from` (or of this slot),
 *   with the piece's folder, so the files are fetched from wherever it lives.
 * - `{ sample }` is the flat shape your kits have always stored: one file, the
 *   sample's id, which the sample source turns into its audio URL.
 * - Recordings are as they are.
 */
export function resolveSlot(
  slot: string,
  stored: KitStoredSlot,
  pieces: ReadonlyMap<string, CataloguePiece>
): KitSampleSlot | null {
  if ('piece' in stored) {
    const piece = pieces.get(stored.piece);
    const spec = piece?.slots[stored.from ?? slot];
    if (!piece || !spec) return null;
    return { ...spec, folder: piece.folder, ...settingsOf(stored) };
  }
  if ('sample' in stored) return { v: null, files: [stored.sample], ...settingsOf(stored) };
  return stored;
}

/**
 * A kit's `samples` with every slot resolved. `missing` names each slot that
 * named a piece the catalogue does not have: the slot is left out, so the kit
 * falls back or synthesises it, as it would any slot it has no recording of.
 */
export function resolveKitSamples(
  stored: KitStoredSamples,
  pieces: ReadonlyMap<string, CataloguePiece>
): { samples: KitSamples; missing: string[] } {
  const { slots: storedSlots, ...rest } = stored;
  if (!storedSlots) return { samples: rest, missing: [] };

  const slots: Record<string, KitSampleSlot> = {};
  const missing: string[] = [];
  for (const [slot, spec] of Object.entries(storedSlots)) {
    const resolved = resolveSlot(slot, spec, pieces);
    if (resolved) slots[slot] = resolved;
    else missing.push(slot);
  }
  return { samples: { ...rest, slots }, missing };
}
