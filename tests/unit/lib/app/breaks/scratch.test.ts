/**
 * The scratch pattern's store — the pattern that has never been saved, kept
 * across a reload.
 *
 * What is read back is untrusted: every earlier version of the app, and anyone
 * with devtools, has written to this key. So the tests that matter are the
 * ones where what comes back is not a pattern.
 *
 * @see lib/app/breaks/scratch.ts
 */

import { describe, expect, it } from 'vitest';

import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import {
  type ScratchStore,
  clearScratch,
  readScratch,
  writeScratch,
} from '@/lib/app/breaks/scratch';
import { breakPayload } from '@/lib/app/breaks/share';
import { testStyle } from '@/tests/helpers/catalogue';

function memoryStore(): ScratchStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const refusing: ScratchStore = {
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

function payload() {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 1,
    bars: 1,
    density: 50,
    ghosts: 50,
  });
  return breakPayload({
    bpm: 94,
    swing: 0,
    level: 5,
    arrangement: ['A'],
    A,
    B: deriveB(A, funk.params),
  });
}

describe('scratch pattern store', () => {
  it('gives back what was kept', () => {
    const store = memoryStore();
    expect(writeScratch(store, payload())).toBe(true);
    expect(readScratch(store)).toEqual(payload());
  });

  it('forgets it when cleared', () => {
    const store = memoryStore();
    writeScratch(store, payload());
    clearScratch(store);
    expect(readScratch(store)).toBeNull();
  });

  it.each([
    ['nothing', null],
    ['not JSON', '{nope'],
    ['JSON that is not a kept pattern', JSON.stringify({ hello: 1 })],
    [
      'a kept pattern whose bars will not read',
      JSON.stringify({ payload: { ...payload(), A: { b: ['x'] } }, at: 1 }),
    ],
    ['a tempo no pattern has', JSON.stringify({ payload: { ...payload(), bpm: 9000 }, at: 1 })],
  ])('reads %s as no scratch', (_name, raw) => {
    const store = memoryStore();
    if (raw !== null) store.data.set('bb.scratch', raw);
    expect(readScratch(store)).toBeNull();
  });

  it('survives storage that refuses everything', () => {
    expect(writeScratch(refusing, payload())).toBe(false);
    expect(readScratch(refusing)).toBeNull();
    expect(() => clearScratch(refusing)).not.toThrow();
  });
});
