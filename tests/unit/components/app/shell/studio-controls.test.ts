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
});
