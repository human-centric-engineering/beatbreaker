import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { describe, expect, it } from 'vitest';

import { BROWSER_KEYS } from '@/lib/app/breaks/browser-keys';

/**
 * What the Studio keeps in this browser is listed in one module, and read
 * through a schema (D19, H9).
 *
 * Nothing but a grep holds that. The way it comes undone is one
 * `useLocalStorage('bb.something', …)` added to a component in six months: it
 * compiles, passes, and trusts whatever is stored by its type again. So this
 * checks the two things the rule is made of — no `useLocalStorage` in the app's
 * components outside the wrapper, and no `bb.` key spelled out anywhere but the
 * key module (everything else takes the key from it).
 *
 * Only quoted strings count as keys; a key named in a comment is in backticks
 * and is prose.
 */

const ROOT = process.cwd();
const KEY_MODULE = 'lib/app/breaks/browser-keys.ts';
const WRAPPER = 'lib/app/breaks/use-stored-setting.ts';

const KEY_LITERAL = /['"](bb\.[A-Za-z.]+)['"]/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else if (/\.tsx?$/.test(name)) out.push(abs);
  }
  return out;
}

const FILES = ['lib/app', 'components/app']
  .flatMap((dir) => walk(join(ROOT, dir)))
  .map((abs) => ({ path: relative(ROOT, abs), source: readFileSync(abs, 'utf8') }));

describe('the browser keys', () => {
  it('finds the files it is meant to be searching', () => {
    /* A wrong path would make every assertion below vacuously true. */
    expect(FILES.some((f) => f.path === KEY_MODULE)).toBe(true);
    expect(FILES.some((f) => f.path === 'components/app/breaks/use-break-console.ts')).toBe(true);
    expect(FILES.some((f) => f.path === 'components/app/studio/panels/patterns-panel.tsx')).toBe(
      true
    );
  });

  it('has no useLocalStorage in the app outside the wrapper', () => {
    const offenders = FILES.filter(
      (f) => f.path !== WRAPPER && /\buseLocalStorage\b/.test(f.source)
    ).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('spells out no bb. key anywhere but the key module', () => {
    const offenders: string[] = [];
    for (const { path, source } of FILES) {
      if (path === KEY_MODULE) continue;
      for (const [, key] of source.matchAll(KEY_LITERAL)) offenders.push(`${path}: ${key}`);
    }
    expect(offenders).toEqual([]);
  });

  it('lists every key the key module spells out, once', () => {
    const source = FILES.find((f) => f.path === KEY_MODULE)!.source;
    const spelled = [...source.matchAll(KEY_LITERAL)].map(([, key]) => key).sort();
    expect([...BROWSER_KEYS].sort()).toEqual(spelled);
    expect(new Set(BROWSER_KEYS).size).toBe(BROWSER_KEYS.length);
    expect(spelled).toEqual([
      'bb.patternsTab',
      'bb.pendingLink',
      'bb.scratch',
      'bb.size',
      'bb.view',
    ]);
  });
});
