import { TOUR_SEEN } from '@/lib/app/breaks/browser-keys';

/**
 * Whether this browser has had the Studio's first-run tour (task 8.6).
 *
 * Read directly rather than through `useStoredSetting`: the hook's first value
 * is always the fallback, so a tour gated on it would open for a moment on
 * every visit. What is stored is untrusted like everything else in
 * `localStorage`, and anything that fails the schema counts as not seen.
 */

const { key: KEY, schema } = TOUR_SEEN;

/** The slice of `Storage` this needs — injectable so it tests without a DOM. */
export type TourStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/* `window.localStorage` is read here, inside each helper's try, not by the
   caller: where a browser blocks site data, merely reading the property
   throws, and a throw from the caller's side escaped the Studio's effect. */
const browserStore = (): TourStore => window.localStorage;

/**
 * True once the tour has been finished or skipped. Storage that cannot be read
 * (private mode, blocked) also reads as seen: a tour that could never remember
 * being dismissed would open on every visit.
 */
export function tourSeen(store: () => TourStore = browserStore): boolean {
  let raw: string | null;
  try {
    raw = store().getItem(KEY);
  } catch {
    return true;
  }
  if (raw === null) return false;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data;
  } catch {
    return false;
  }
}

/** Don't show it again. */
export function markTourSeen(store: () => TourStore = browserStore): void {
  try {
    store().setItem(KEY, JSON.stringify(true));
  } catch {
    // nothing to do: the tour is closed for this visit either way
  }
}

/** _Show the tour again_ on `/help`: the next Studio visit opens it. */
export function forgetTour(store: () => TourStore = browserStore): void {
  try {
    store().removeItem(KEY);
  } catch {
    // storage refused; the button says where the tour will be, nothing more
  }
}
