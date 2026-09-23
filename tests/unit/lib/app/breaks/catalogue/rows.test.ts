import { describe, expect, it } from 'vitest';

import type { KitRow, LibraryRow, StyleRow } from '@/lib/app/breaks/catalogue/rows';
import {
  styleGroupsOf,
  toKit,
  toKits,
  toLibrary,
  toStyle,
  toStyles,
} from '@/lib/app/breaks/catalogue/rows';
import type { CatalogueStyle } from '@/lib/app/breaks/catalogue/types';
import { testKit, testLibrary, testStyle } from '@/tests/helpers/catalogue';

/**
 * Rows are external data, validated on the way out of the database
 * (`.context/app/catalogue.md` §"Validation — rows are external data").
 *
 * The property under test throughout this file is the one the doc states
 * explicitly: a row that fails validation is dropped and reported, never
 * thrown — one bad style/kit/entry costs you that row, not the whole picker.
 * `toStyles`/`toKits`/`toLibrary` partition rather than fail-fast, and that
 * partitioning is what these tests pin.
 */

const FUNK_PARAMS = testStyle('funk').params;

function styleRow(overrides: Partial<StyleRow> = {}): StyleRow {
  return {
    key: 'funk',
    group: 'Classic',
    currentVersion: 1,
    versions: [{ id: 'v1', version: 1, params: FUNK_PARAMS }],
    ...overrides,
  };
}

describe('toStyle', () => {
  it('resolves to currentVersion when no version is asked for', () => {
    const row = styleRow({
      currentVersion: 2,
      versions: [
        { id: 'v1', version: 1, params: FUNK_PARAMS },
        { id: 'v2', version: 2, params: { ...FUNK_PARAMS, swing: 40 } },
      ],
    });

    const style = toStyle(row);

    expect('reason' in style).toBe(false);
    expect(style).toMatchObject({ versionId: 'v2', version: 2 });
  });

  it('resolves a named older version instead — what lets a March break re-derive in June', () => {
    const row = styleRow({
      currentVersion: 2,
      versions: [
        { id: 'v1', version: 1, params: FUNK_PARAMS },
        { id: 'v2', version: 2, params: { ...FUNK_PARAMS, swing: 40 } },
      ],
    });

    const style = toStyle(row, 1);

    expect('reason' in style).toBe(false);
    if ('reason' in style) throw new Error('unreachable');
    expect(style.versionId).toBe('v1');
    expect(style.params).toEqual(FUNK_PARAMS);
  });

  it('reports a problem, not a throw, for a version that is not there', () => {
    const row = styleRow();

    const result = toStyle(row, 99);

    expect(result).toEqual({ what: 'style', key: 'funk', reason: 'no version 99' });
  });
});

describe('toStyles — the drop-not-throw partition', () => {
  it('drops the one row whose params fail the schema and keeps the rest', () => {
    const good = styleRow({ key: 'funk' });
    // `swing` is bounded 0–100 by styleParamsSchema; 999 is exactly the kind of
    // out-of-range value that predates the bound, or arrives from a restored
    // backup, or was set by hand at a psql prompt (the scenario the doc names).
    const bad = styleRow({
      key: 'broken',
      versions: [{ id: 'bad-1', version: 1, params: { ...FUNK_PARAMS, swing: 999 } }],
    });

    const { rows, problems } = toStyles([good, bad]);

    expect(rows.map((s) => s.key)).toEqual(['funk']);
    expect(problems).toEqual([
      { what: 'style', key: 'broken', reason: expect.stringContaining('swing') },
    ]);
  });
});

describe('toKit', () => {
  const VALID_KIT_PARAMS = { master: {}, k: {}, s: {}, h: {}, r: {}, c: {}, t: {}, p: {} };

  function kitRow(overrides: Partial<KitRow> = {}): KitRow {
    return {
      key: 'test-kit',
      engine: 'drift',
      label: 'Test kit',
      hint: 'A kit for a test.',
      group: 'Drum machines',
      credit: null,
      params: VALID_KIT_PARAMS,
      samples: {},
      ...overrides,
    };
  }

  it('keeps a recognised engine as written', () => {
    const kit = toKit(kitRow({ engine: 'drift' }));
    expect('reason' in kit).toBe(false);
    if ('reason' in kit) throw new Error('unreachable');
    expect(kit.engine).toBe('drift');
  });

  it("falls back to 'synth' for an engine value outside the four — a hand-written row, or a fork that removed one", () => {
    const kit = toKit(kitRow({ engine: 'flux-capacitor' }));

    expect('reason' in kit).toBe(false);
    if ('reason' in kit) throw new Error('unreachable');
    expect(kit.engine).toBe('synth');
  });

  it('reports a problem for params that fail kitParamsSchema, rather than throwing', () => {
    const kit = toKit(kitRow({ params: {} }));

    expect(kit).toMatchObject({ what: 'kit', key: 'test-kit' });
  });

  it('round-trips a real seeded kit through the catalogue shape', () => {
    const studio70 = testKit('studio70');
    const { key, label, hint, engine, credit, group, samples, ...params } = studio70;
    const row = kitRow({
      key,
      label,
      hint,
      engine,
      credit: credit ?? null,
      group,
      samples,
      params,
    });

    const kit = toKit(row);

    expect('reason' in kit).toBe(false);
    if ('reason' in kit) throw new Error('unreachable');
    expect(kit.key).toBe('studio70');
    expect(kit.engine).toBe(engine);
  });
});

describe('toKits — the drop-not-throw partition', () => {
  it('drops a kit whose samples fail validation and keeps the rest', () => {
    const good: KitRow = {
      key: 'ok',
      engine: 'synth',
      label: 'OK',
      hint: '',
      group: 'Synthesised',
      credit: null,
      params: { master: {}, k: {}, s: {}, h: {}, r: {}, c: {}, t: {}, p: {} },
      samples: {},
    };
    // `files` needs a plain file name — a `..` here is exactly the path-traversal
    // shape the schema exists to refuse (schemas.ts's own comment on the slot).
    const bad: KitRow = {
      ...good,
      key: 'traversal',
      samples: { slots: { kick: { v: null, files: ['../../etc/passwd'] } } },
    };

    const { rows, problems } = toKits([good, bad]);

    expect(rows.map((k) => k.key)).toEqual(['ok']);
    expect(problems).toEqual([{ what: 'kit', key: 'traversal', reason: expect.any(String) }]);
  });
});

describe('toLibrary', () => {
  it('drops an entry whose doc is not a valid packed pattern, keeping the rest and reporting it', () => {
    const goodEntry = testLibrary().entries[0];
    if (!goodEntry) throw new Error('seed library has no entries to build a fixture from');

    const row: LibraryRow = {
      key: 'famous-breaks',
      title: 'Famous breaks',
      description: 'The main groove off each record.',
      entries: [
        { ...goodEntry },
        {
          id: 'bad-1',
          group: 'Funk',
          title: 'Not A Pattern',
          artist: 'Nobody',
          note: null,
          bpm: 100,
          styleKey: 'funk',
          styleVersionId: null,
          meter: '4/4',
          doc: { this: 'is not a packed pattern' },
        },
      ],
    };

    const { library, problems } = toLibrary(row);

    expect(library.entries.map((e) => e.id)).toEqual([goodEntry.id]);
    expect(problems).toEqual([
      { what: 'entry', key: 'famous-breaks/Not A Pattern', reason: expect.any(String) },
    ]);
  });
});

describe('styleGroupsOf', () => {
  it('preserves row order — first-seen group order, and key order within a group', () => {
    const funk = testStyle('funk');
    const styles: CatalogueStyle[] = [
      { ...funk, key: 'a1', group: 'A' },
      { ...funk, key: 'b1', group: 'B' },
      // Group A reappears non-contiguously; it must not start a second "A"
      // heading or lose a1's position within it — the picker renders headings
      // in the order they were first seen and keys in the order the query gave them.
      { ...funk, key: 'a2', group: 'A' },
    ];

    expect(styleGroupsOf(styles)).toEqual([
      ['A', ['a1', 'a2']],
      ['B', ['b1']],
    ]);
  });
});
