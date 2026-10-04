/**
 * The kit builder's rows (9.18): what choosing a piece, turning a knob and
 * hearing a piece send, held against the slot and lane rosters they name.
 */

import { describe, expect, it } from 'vitest';

import { SLOT_BY_ID } from '@/lib/app/breaks/kit';
import {
  BUILDER_ROWS,
  type BuilderRow,
  type PieceView,
  fillRow,
  pieceGroups,
  previewOf,
  rowNow,
  rowPan,
  rowSettings,
} from '@/lib/app/breaks/kit-builder';
import { LANES } from '@/lib/app/breaks/lanes';
import type { YourKitView } from '@/lib/validations/samples';

const row = (id: string): BuilderRow => BUILDER_ROWS.find((r) => r.id === id)!;

const slot = (velocities: number[], trim = 1) => ({
  layers: velocities.map((v, i) => ({ velocity: v, urls: [`/kits/x/${i}-a.m4a`] })),
  trim,
});

function piece(key: string, role: string, slots: string[], source = 'bigrusty'): PieceView {
  return {
    key,
    label: key,
    role,
    source,
    credit: null,
    slots: Object.fromEntries(slots.map((s) => [s, slot([0.2, 0.6])])),
  };
}

const SPEC = { layers: [{ v: 0.5, files: ['a.m4a'] }], folder: 'bigrusty' };

function kit(slots: YourKitView['slots'], pan?: YourKitView['pan']): YourKitView {
  return { id: 'k1', key: 'yours-a', label: 'Mine', slots, ...(pan ? { pan } : {}) };
}

describe('BUILDER_ROWS', () => {
  it('names only real slots and lanes, and every slot but the percussion once', () => {
    const slots = BUILDER_ROWS.flatMap((r) => r.slots);
    for (const s of slots) expect(SLOT_BY_ID[s], s).toBeDefined();
    for (const l of BUILDER_ROWS.flatMap((r) => r.lanes)) expect(LANES).toContain(l);
    expect(new Set(slots).size).toBe(slots.length);
    const pieceSlots = Object.keys(SLOT_BY_ID).filter((s) => SLOT_BY_ID[s].voice !== 'p');
    expect([...slots].sort()).toEqual(pieceSlots.sort());
  });
});

describe('pieceGroups', () => {
  it('offers a row only its role, grouped by source under the source’s title, in order', () => {
    const pieces = [
      piece('bigrusty-s', 'snare', ['s', 'sGhost']),
      piece('drs-s', 'snare', ['s'], 'drskit'),
      piece('bigrusty-k', 'kick', ['k']),
      piece('drs-brush-sCross', 'snare', ['sCross'], 'drskit'),
    ];
    const groups = pieceGroups(pieces, row('snare'));
    expect(groups.map((g) => g.label)).toEqual(['Big Rusty Drums', 'DRSKit']);
    expect(groups[1].pieces.map((p) => p.key)).toEqual(['drs-s', 'drs-brush-sCross']);
  });
});

describe('fillRow', () => {
  it('fills each of the row’s slots the piece has and empties the rest', () => {
    expect(fillRow(row('snare'), piece('drs-s', 'snare', ['s', 'sGhost', 'sCross']))).toEqual({
      s: { piece: 'drs-s' },
      sGhost: { piece: 'drs-s' },
      sCross: { piece: 'drs-s' },
      sRim: null,
    });
  });

  it('plays a piece from its own first slot where it has none of the row’s', () => {
    expect(fillRow(row('t2'), piece('bigrusty-t1', 'tom', ['t1']))).toEqual({
      t2: { piece: 'bigrusty-t1', from: 't1' },
    });
    expect(fillRow(row('crash'), piece('salamander-crash', 'crash', ['c2']))).toEqual({
      c: null,
      c2: { piece: 'salamander-crash' },
      cChina: null,
    });
    expect(fillRow(row('splash'), piece('bigrusty-c', 'crash', ['c', 'c2']))).toEqual({
      cSplash: { piece: 'bigrusty-c', from: 'c' },
    });
  });

  it('carries the row’s settings over, leaving the defaults out', () => {
    expect(
      fillRow(row('kick'), piece('drs-k', 'kick', ['k']), { level: 0.8, tune: 0, decay: 1 })
    ).toEqual({ k: { piece: 'drs-k', level: 0.8 } });
  });

  it('empties the whole row for no piece', () => {
    expect(fillRow(row('ride'), null)).toEqual({ r: null, rBell: null });
  });
});

describe('rowNow and rowSettings', () => {
  const mine = kit({
    sGhost: { piece: 'drs-s', label: 'DRS snare', spec: SPEC, tune: -200 },
    sCross: { sampleId: 'csmp1', name: 'click.wav', audioUrl: '/a', level: 0.5 },
  });

  it('reads a row by its first filled slot, with the defaults for what it does not set', () => {
    const now = rowNow(mine, row('snare'));
    expect(now.slot).toBe('sGhost');
    expect(now.piece).toBe('drs-s');
    expect(now.settings).toEqual({ level: 1, tune: -200, decay: 1 });
    expect(rowNow(mine, row('kick'))).toMatchObject({ slot: undefined, piece: undefined });
  });

  it('writes the settings to every filled slot of the row, a sample as much as a piece', () => {
    expect(rowSettings(mine, row('snare'), { level: 1.2, tune: 100, decay: 1 })).toEqual({
      sGhost: { piece: 'drs-s', level: 1.2, tune: 100 },
      sCross: { sample: 'csmp1', level: 1.2, tune: 100 },
    });
  });

  it('keeps a piece’s `from`, and an empty setting is the recording’s own', () => {
    const toms = kit({ t3: { piece: 'drs-t1', from: 't1', label: 'x', spec: SPEC, level: 2 } });
    expect(rowSettings(toms, row('t3'), {})).toEqual({ t3: { piece: 'drs-t1', from: 't1' } });
  });

  it('reads a row’s pan from its lane, and nothing where the kit takes the default', () => {
    expect(rowPan(kit({}, { h: 0.4 }), row('hats'))).toBe(0.4);
    expect(rowPan(kit({}), row('hats'))).toBeUndefined();
    expect(rowPan(kit({}, { c: 0.1 }), row('splash'))).toBeUndefined();
  });
});

describe('previewOf', () => {
  it('plays the loudest take of the slot the row is heard by, at its trim', () => {
    const p: PieceView = {
      ...piece('bigrusty-h', 'hat', []),
      slots: { hOpen: slot([0.3], 0.5), h: slot([0.2, 0.7, 0.4], 0.9) },
    };
    expect(previewOf(p, row('hats'))).toEqual({ url: '/kits/x/1-a.m4a', trim: 0.9, velocity: 0.7 });
  });

  it('falls back on the piece’s first slot for a row it was lent to', () => {
    expect(previewOf(piece('bigrusty-t1', 'tom', ['t1']), row('t3'))).toMatchObject({
      url: '/kits/x/1-a.m4a',
    });
  });
});
