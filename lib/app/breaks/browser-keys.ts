import { z } from 'zod';

import { PATTERNS_TABS } from '@/components/app/shell/studio-address';
import { GRIP_CHOICES, type GripChoice } from '@/lib/app/breaks/drummer/grips';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';

/**
 * Everything the Studio keeps in this browser, each key with the schema it is
 * read back through (D19).
 *
 * What stays here depends on the screen in front of you, or only has to last a
 * few minutes; how you play lives in your account (`StudioSettings`) and a
 * pattern's values in its document. `localStorage` is written by this app, but
 * also by every earlier version of it and by anyone with devtools, so nothing
 * is trusted by its type: a value that fails its schema is the default.
 *
 * A key the app writes that is not listed here fails
 * `tests/unit/lib/app/breaks/browser-keys.test.ts`. Light/dark is Sunrise's own
 * `theme` key and is not the Studio's to list.
 */

/** One browser setting: where it is kept, what it must look like, and what it is otherwise. */
export interface StoredSetting<T> {
  key: string;
  schema: z.ZodType<T>;
  fallback: T;
}

/** Which layers the chart shows: A alone, B alone, or both. */
export const VIEW_MODES = ['A', 'B', 'both'] as const;

/** The chart's zoom, within what the size slider allows. */
export const SIZE_MIN = 0.7;
export const SIZE_MAX = 1.7;

export const SIZE: StoredSetting<number> = {
  key: 'bb.size',
  schema: z.number().min(SIZE_MIN).max(SIZE_MAX),
  fallback: 1,
};

/** The step grid's zoom (task 5.14), on top of the 24px / 32px cell. */
export const GRID_SIZE_MIN = 0.75;
export const GRID_SIZE_MAX = 2;

export const GRID_SIZE: StoredSetting<number> = {
  key: 'bb.gridSize',
  schema: z.number().min(GRID_SIZE_MIN).max(GRID_SIZE_MAX),
  fallback: 1,
};

export const VIEW: StoredSetting<(typeof VIEW_MODES)[number]> = {
  key: 'bb.view',
  schema: z.enum(VIEW_MODES),
  fallback: 'both',
};

/** The Patterns drawer's last tab; `null` lets the drawer pick from what you have. */
export const PATTERNS_TAB: StoredSetting<(typeof PATTERNS_TABS)[number] | null> = {
  key: 'bb.patternsTab',
  schema: z.enum(PATTERNS_TABS).nullable(),
  fallback: null,
};

/** How Download .mid writes the timing: humanised as you hear it, or without Humanise (Phase 9). */
export const MIDI_TIMINGS = ['played', 'quantised'] as const;

export const MIDI_TIMING: StoredSetting<(typeof MIDI_TIMINGS)[number]> = {
  key: 'bb.midiTiming',
  schema: z.enum(MIDI_TIMINGS),
  fallback: 'played',
};

/** What the stage shows: the chart, or the 3D drummer playing it (experiment). */
export const STAGE_VIEWS = ['chart', 'drummer'] as const;

export const STAGE_VIEW: StoredSetting<(typeof STAGE_VIEWS)[number]> = {
  key: 'bb.stageView',
  schema: z.enum(STAGE_VIEWS),
  fallback: 'chart',
};

/** Which way round the 3D drummer's kit is set up: the lead hand on the hats. */
export const DRUMMER_HANDS = ['right', 'left'] as const;

export const DRUMMER_HAND: StoredSetting<(typeof DRUMMER_HANDS)[number]> = {
  key: 'bb.drummerHand',
  schema: z.enum(DRUMMER_HANDS),
  fallback: 'right',
};

/**
 * How the 3D drummer holds the sticks (`GRIP_CHOICES`). The setting once held
 * only which hands played traditional (`none`, `other`, `both`); those values
 * are read as the grips they were.
 */
const LEGACY_GRIP: Record<string, GripChoice> = {
  none: 'american',
  other: 'traditional',
  both: 'traditionalBoth',
};

export const DRUMMER_GRIP: StoredSetting<GripChoice> = {
  key: 'bb.drummerGrip',
  schema: z.preprocess(
    (v) => (typeof v === 'string' && v in LEGACY_GRIP ? LEGACY_GRIP[v] : v),
    z.enum(GRIP_CHOICES)
  ),
  fallback: 'american',
};

/** The scrolling chart and beat count in the corner of the 3D drummer view. */
export const DRUMMER_CHART: StoredSetting<boolean> = {
  key: 'bb.drummerChart',
  schema: z.boolean(),
  fallback: true,
};

/**
 * The first-run tour (task 8.6) has been seen, or skipped, in this browser. A
 * new device shows it again, which is fine: it is three steps, and it does not
 * earn a column. Read once when the Studio is up, not through the hook, whose
 * first value is the fallback (`lib/app/breaks/tour-seen.ts`).
 */
export const TOUR_SEEN: StoredSetting<boolean> = {
  key: 'bb.tourSeen',
  schema: z.boolean(),
  fallback: false,
};

/**
 * The two short-lived hand-offs. Each is read once, by its own module
 * (`scratch.ts`, `pending-link.ts`), not through the hook; they are listed here
 * so the whole of what the browser holds is in one place.
 */

/** The pattern on the stage that has never been saved. */
export const SCRATCH = {
  key: 'bb.scratch',
  schema: z.object({ payload: sharePayloadSchema, at: z.number() }),
} as const;

/** A shared link held across sign-in (H5). */
export const PENDING_LINK = {
  key: 'bb.pendingLink',
  schema: z.object({ hash: z.string().startsWith('#b='), at: z.number() }),
} as const;

/** Every key above — what the grep test holds the app's `bb.` literals to. */
export const BROWSER_KEYS = [
  SIZE.key,
  GRID_SIZE.key,
  VIEW.key,
  PATTERNS_TAB.key,
  MIDI_TIMING.key,
  STAGE_VIEW.key,
  DRUMMER_HAND.key,
  DRUMMER_GRIP.key,
  DRUMMER_CHART.key,
  TOUR_SEEN.key,
  SCRATCH.key,
  PENDING_LINK.key,
] as const;
