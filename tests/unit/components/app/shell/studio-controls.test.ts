import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { describe, expect, it } from 'vitest';

/**
 * The Studio's controls, as the source spells them (Phase 5-ii).
 *
 * One kind of toggle and one kind of segmented choice (E19): the pressed and
 * checked states are written in `toggle.tsx` and `segmented.tsx` and nowhere
 * else, so a new panel cannot hand-roll a fifth style of on/off. A grep is the
 * only thing that sees a control that was never built from either.
 *
 * MIDI is a file you download, not base64 to decode in a terminal (E6), and
 * Print chart prints the chart, not the Studio around it (E7) — the second is
 * a stylesheet, which no component test can print.
 */

const ROOT = process.cwd();

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else if (/\.tsx$/.test(name)) out.push(abs);
  }
  return out;
}

const FILES = walk(join(ROOT, 'components/app')).map((abs) => ({
  path: relative(ROOT, abs),
  source: readFileSync(abs, 'utf8'),
}));

const css = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** The body of every `@media print` block in a stylesheet, run together. */
function printRules(source: string): string {
  let out = '';
  for (
    let at = source.indexOf('@media print');
    at >= 0;
    at = source.indexOf('@media print', at + 1)
  ) {
    let depth = 0;
    let i = source.indexOf('{', at);
    const start = i;
    for (; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}' && --depth === 0) break;
    }
    out += source.slice(start, i);
  }
  return out;
}

const OWNERS = ['components/app/studio/toggle.tsx', 'components/app/studio/segmented.tsx'];

describe('the Studio controls', () => {
  it('finds the files it is meant to be searching', () => {
    for (const path of [...OWNERS, 'components/app/studio/stage.tsx']) {
      expect(FILES.some((f) => f.path === path)).toBe(true);
    }
  });

  it('writes aria-pressed and aria-checked only in Toggle and Segmented', () => {
    const offenders = FILES.filter(
      (f) => !OWNERS.includes(f.path) && /aria-(pressed|checked)/.test(f.source)
    ).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('says nothing about base64 anywhere in the Studio', () => {
    const offenders = FILES.filter((f) => /base64/i.test(f.source)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('prints the chart and leaves the Studio’s chrome and the editing controls off the page', () => {
    const frame = printRules(css('components/app/shell/studio.css'));
    for (const hidden of ['.studio-header', '.studio-rail', '.studio-footer', '.studio-drawer']) {
      expect(frame).toContain(hidden);
    }
    /* Fixed to the window, the frame would print one page of whatever was in view. */
    expect(frame).toMatch(/\.studio-frame\s*{[^}]*position:\s*static/);

    const stage = printRules(css('components/app/breaks/breaks.css'));
    for (const hidden of ['.stage > .card', '.chart-hd .seg', '.chart-tools', '.chart-ft']) {
      expect(stage).toContain(hidden);
    }
    expect(stage).not.toMatch(/\.chartwrap\s*,|\.stave/);
  });
});
