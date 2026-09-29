import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { describe, expect, it } from 'vitest';

import { TOOLS } from '@/components/app/shell/tool-rail';

/**
 * The Studio's navigation says what a drawer is for, in a drummer's words
 * (Phase 5, E13). The old names were the console's voice — "Break doctor",
 * "Take it away" — and they read well once and badly as a place to look for
 * something. Nothing but a grep keeps them from coming back in a new heading.
 *
 * Only text a person reads counts: JSX text and quoted strings. A comment that
 * names the break doctor is talking about the moves, which keep that name.
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

const OLD_NAMES = ['Generator', 'Break doctor', 'Practice rig', 'Take it away', 'Groove critic'];

describe('the Studio names', () => {
  it('finds the files it is meant to be searching', () => {
    expect(FILES.some((f) => f.path === 'components/app/shell/tool-drawer.tsx')).toBe(true);
    expect(FILES.some((f) => f.path === 'components/app/studio/panels/generate-panel.tsx')).toBe(
      true
    );
  });

  it('shows none of the old names', () => {
    const offenders: string[] = [];
    for (const { path, source } of FILES) {
      for (const name of OLD_NAMES) {
        const shown = new RegExp(`(>\\s*${name}\\s*<|['"\`]${name}['"\`])`);
        if (shown.test(source)) offenders.push(`${path}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('labels the rail in the new names, in order', () => {
    expect(TOOLS.map((t) => t.label)).toEqual([
      'Generate',
      'Edit',
      'Patterns',
      'Sound',
      'Practise',
      'Share',
      'BeatBuddy',
    ]);
  });
});
