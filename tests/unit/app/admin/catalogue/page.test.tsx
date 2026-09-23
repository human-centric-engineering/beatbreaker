/**
 * The admin catalogue pages.
 *
 * Two things worth pinning, and they are both about where the data comes from
 * rather than about the markup:
 *
 * 1. **The lists are rendered from the database on the server**, not fetched in
 *    an effect. A client fetch here would be a round trip to ask this app what
 *    it already knows, and it is the shape that turns into an N+1 the moment
 *    somebody adds a per-row count.
 * 2. **They are not the cached read.** `lib/app/breaks/catalogue/data.ts`
 *    memoises, which is right for a picker served on every page load and wrong
 *    for the page an admin reloads to check the edit they just saved. These
 *    pages use `admin-lists.ts`, which does not.
 *
 * The second is the one a refactor would quietly break — the two modules answer
 * almost the same question — so it is asserted by module, not by behaviour.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/catalogue/admin-lists', () => ({
  adminStyles: vi.fn(),
  adminLibraries: vi.fn(),
  adminKits: vi.fn(),
  adminStyle: vi.fn(),
}));
/* Mocked so that a page reaching for it fails loudly rather than silently
   serving a memoised snapshot. Nothing under /admin should call it. */
vi.mock('@/lib/app/breaks/catalogue/data', () => ({
  studioCatalogue: vi.fn(() => {
    throw new Error('the admin pages must not read the cached catalogue');
  }),
  listStyles: vi.fn(() => {
    throw new Error('the admin pages must not read the cached catalogue');
  }),
}));

import AdminCataloguePage from '@/app/admin/catalogue/page';
import {
  adminKits,
  adminLibraries,
  adminStyle,
  adminStyles,
} from '@/lib/app/breaks/catalogue/admin-lists';

const STYLE = {
  id: 's1',
  key: 'funk',
  label: 'Funk 16ths',
  hint: 'Stubblefield territory.',
  group: 'Funk and breaks',
  meter: '4/4',
  position: 0,
  currentVersion: 2,
  updatedAt: new Date('2026-09-23'),
  versionCount: 2,
};

describe('/admin/catalogue', () => {
  it('reads all three lists from the uncached admin queries', async () => {
    vi.mocked(adminStyles).mockResolvedValue([STYLE]);
    vi.mocked(adminLibraries).mockResolvedValue([
      {
        id: 'l1',
        key: 'famous-breaks',
        title: 'Famous breaks',
        description: 'The main groove off each record.',
        entryCount: 47,
        groups: [{ group: 'Funk and the breaks', count: 6 }],
      },
    ]);
    vi.mocked(adminKits).mockResolvedValue([
      {
        id: 'k1',
        key: 'studio70',
        label: "Studio '70s",
        hint: 'Warm and dry.',
        group: 'Synthesised',
        engine: 'synth',
        credit: null,
        position: 0,
      },
    ]);

    const el = await AdminCataloguePage();

    expect(adminStyles).toHaveBeenCalled();
    expect(adminLibraries).toHaveBeenCalled();
    expect(adminKits).toHaveBeenCalled();
    /* Rendered, not fetched: the element tree exists by the time the page's
       promise resolves, which is only true of a server render. */
    expect(el).toBeDefined();
  });

  it('asks for every list in parallel rather than in sequence', async () => {
    /* Three independent queries awaited one after another is three round trips
       where one would do. `Promise.all` is what the page uses; this is what
       says so — each mock resolves only once all three have been called. */
    const calls: string[] = [];
    const gate = { resolve: (): void => {} };
    const waiting = new Promise<void>((r) => (gate.resolve = r));

    const record = (name: string) => async () => {
      calls.push(name);
      if (calls.length === 3) gate.resolve();
      await waiting;
      return [];
    };
    vi.mocked(adminStyles).mockImplementation(record('styles'));
    vi.mocked(adminLibraries).mockImplementation(record('libraries'));
    vi.mocked(adminKits).mockImplementation(record('kits'));

    await AdminCataloguePage();
    expect(calls.sort()).toEqual(['kits', 'libraries', 'styles']);
  });

  it('exists so the nav item has somewhere to point', () => {
    /* The seam in lib/app/admin-nav.ts registers `/admin/catalogue`, and
       defaults.test.ts pins that href. A page that moved would leave the
       sidebar pointing at a 404 and nothing else would notice. */
    expect(typeof AdminCataloguePage).toBe('function');
    expect(typeof adminStyle).toBe('function');
  });
});
