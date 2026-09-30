/**
 * Which BeatBuddy tool results the Studio applies (7.13): only a result whose
 * document parses, only the newest rev, only once, and never over an edit the
 * drummer made since.
 */

import { describe, expect, it } from 'vitest';

import {
  decideApply,
  newestChange,
  notesKey,
  readToolChange,
  type ToolChange,
} from '@/lib/app/breaks/buddy/apply';
import { funkPayload } from '@/tests/helpers/buddy';

const DOC = funkPayload();

function change(rev: number, doc = DOC): ToolChange {
  return { tool: 'apply_doctor_move', doc, rev, summary: `rev ${rev}` };
}

describe('readToolChange', () => {
  it('reads a successful result carrying a valid document', () => {
    const got = readToolChange('tidy_pattern', {
      success: true,
      data: { doc: DOC, rev: 4, summary: 'Tidy: 1 change', changes: [], notes: [] },
    });
    expect(got).toEqual({ tool: 'tidy_pattern', doc: DOC, rev: 4, summary: 'Tidy: 1 change' });
  });

  it('ignores a failed call, a read-only result and a document the wire format rejects', () => {
    expect(
      readToolChange('apply_doctor_move', { success: false, error: { code: 'workspace_changed' } })
    ).toBeNull();
    expect(readToolChange('list_styles', { success: true, data: { styles: [] } })).toBeNull();
    expect(
      readToolChange('write_bars', {
        success: true,
        data: { doc: { ...DOC, bpm: 9000 }, rev: 3, summary: 'x' },
      })
    ).toBeNull();
    expect(readToolChange('write_bars', 'not an object')).toBeNull();
  });
});

describe('newestChange', () => {
  it('picks the highest rev, whatever order the batch lists them in', () => {
    expect(newestChange([change(7), change(5), change(6)], 4)?.rev).toBe(7);
  });

  it('ignores anything at or below the rev already applied', () => {
    expect(newestChange([change(3), change(4)], 4)).toBeNull();
  });
});

describe('decideApply', () => {
  const key = notesKey(DOC);

  it('applies the newest change when the stage still shows the baseline', () => {
    const d = decideApply([change(3), change(5)], { appliedRev: 2, baseline: key, current: key });
    expect(d).toEqual({ kind: 'apply', change: change(5) });
  });

  it('drops a change that is older than a manual edit', () => {
    const edited = funkPayload(7);
    const d = decideApply([change(3)], {
      appliedRev: 2,
      baseline: key,
      current: notesKey(edited),
    });
    expect(d.kind).toBe('stale');
  });

  it('has nothing to do when no result carries a newer document', () => {
    expect(decideApply([], { appliedRev: 0, baseline: key, current: key })).toEqual({
      kind: 'none',
    });
  });
});

describe('notesKey', () => {
  it('ignores tempo, swing and layer, which practising changes', () => {
    expect(notesKey({ ...DOC, bpm: 80, sw: 30, lv: 2 })).toBe(notesKey(DOC));
  });

  it('changes when a note does', () => {
    const other = { ...DOC, A: { ...DOC.A, b: [...DOC.A.b].reverse() } };
    expect(notesKey(other)).not.toBe(notesKey(DOC));
  });
});
