/**
 * Whether this browser has had the first-run tour (task 8.6).
 *
 * What is stored is untrusted, like every `bb.` key. The cases that matter are
 * the ones where what comes back is not `true`, and the one where storage
 * can't be read at all: a tour that can never remember being dismissed would
 * open on every visit, so that reads as seen.
 *
 * @see lib/app/breaks/tour-seen.ts
 */

import { describe, expect, it } from 'vitest';

import { TOUR_SEEN } from '@/lib/app/breaks/browser-keys';
import { type TourStore, forgetTour, markTourSeen, tourSeen } from '@/lib/app/breaks/tour-seen';

function memoryStore(): TourStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const refusing: TourStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('tour-seen', () => {
  it('is not seen in a browser that has never had it', () => {
    expect(tourSeen(() => memoryStore())).toBe(false);
  });

  it('is seen once marked, under its listed key, and not seen once forgotten', () => {
    const store = memoryStore();
    markTourSeen(() => store);
    expect(store.data.get(TOUR_SEEN.key)).toBe('true');
    expect(tourSeen(() => store)).toBe(true);

    forgetTour(() => store);
    expect(store.data.has(TOUR_SEEN.key)).toBe(false);
    expect(tourSeen(() => store)).toBe(false);
  });

  it.each([
    ['false', 'false'],
    ['not JSON', '{nope'],
    ['the wrong type', '"yes"'],
    ['a number', '1'],
  ])('reads %s as not seen', (_, raw) => {
    const store = memoryStore();
    store.data.set(TOUR_SEEN.key, raw);
    expect(tourSeen(() => store)).toBe(false);
  });

  it('reads a browser that blocks storage as seen, and never throws, even getting the store', () => {
    const blocked = () => {
      throw new Error('SecurityError: The operation is insecure.');
    };
    expect(tourSeen(blocked)).toBe(true);
    expect(() => markTourSeen(blocked)).not.toThrow();
    expect(() => forgetTour(blocked)).not.toThrow();
  });

  it('reads storage it cannot read as seen, and writing to it does not throw', () => {
    expect(tourSeen(() => refusing)).toBe(true);
    expect(() => markTourSeen(() => refusing)).not.toThrow();
    expect(() => forgetTour(() => refusing)).not.toThrow();
  });
});
