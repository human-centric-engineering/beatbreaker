/**
 * The stash that carries a shared link through sign-in (H5).
 */

import { describe, expect, it } from 'vitest';

import {
  PENDING_LINK_TTL_MS,
  type LinkStore,
  stashPendingLink,
  takePendingLink,
} from '@/lib/app/breaks/pending-link';

function memoryStore(): LinkStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const T0 = 1_800_000_000_000;

describe('pending link', () => {
  it('gives back what was stashed, once', () => {
    const store = memoryStore();
    expect(stashPendingLink(store, '#b=abc', T0)).toBe(true);
    expect(takePendingLink(store, T0 + 1000)).toBe('#b=abc');
    expect(takePendingLink(store, T0 + 2000)).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it.each([
    ['', ''],
    ['an empty code', '#b='],
    ['some other fragment', '#top'],
    ['no fragment marker', 'b=abc'],
  ])('stashes nothing for %s', (_label, hash) => {
    const store = memoryStore();
    expect(stashPendingLink(store, hash, T0)).toBe(false);
    expect(store.data.size).toBe(0);
  });

  it('expires after an hour, and spends the stale entry', () => {
    const store = memoryStore();
    stashPendingLink(store, '#b=abc', T0);
    expect(takePendingLink(store, T0 + PENDING_LINK_TTL_MS + 1)).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it('refuses an entry from the future, or one this page did not write', () => {
    const store = memoryStore();
    stashPendingLink(store, '#b=abc', T0 + 60_000);
    expect(takePendingLink(store, T0)).toBeNull();

    store.data.set('bb.pendingLink', JSON.stringify({ hash: 'javascript:alert(1)', at: T0 }));
    expect(takePendingLink(store, T0)).toBeNull();
    store.data.set('bb.pendingLink', 'not json');
    expect(takePendingLink(store, T0)).toBeNull();
  });

  it('survives storage that throws', () => {
    const broken: LinkStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(stashPendingLink(broken, '#b=abc', T0)).toBe(false);
    expect(takePendingLink(broken, T0)).toBeNull();
  });
});
