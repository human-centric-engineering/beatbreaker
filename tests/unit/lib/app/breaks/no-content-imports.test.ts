import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { describe, expect, it } from 'vitest';

/**
 * Content is data, not code — and this is the test that keeps it that way.
 *
 * Phase 2 moved the style table, the famous breaks and the kit table out of
 * `lib/app/breaks/` and into database rows seeded from
 * `prisma/seeds/app-beatbreaker/data/`. The domain now takes a resolved style,
 * entry or kit as an argument.
 *
 * Nothing enforces that but a grep. The refactor is a hundred call sites, and
 * the way it comes undone is not a revert — it is one import added back in six
 * months because a function needed "just the default style". That import would
 * compile, pass every other test, and silently reintroduce the thing the phase
 * existed to remove: a copy of the catalogue compiled into the bundle, which an
 * admin's edit cannot reach and which a fork cannot change without a deploy.
 *
 * **The check is on the import, not on the behaviour**, because by the time the
 * behaviour is wrong the data has already diverged.
 *
 * `tests/**` is exempt, and deliberately: the tests feed the domain the *same*
 * seed data through the new arguments, which is the only way the golden-byte
 * assertions still mean anything. `prisma/seeds/**` is exempt because it is
 * the seed — it is what reads the data and writes the rows.
 */

const ROOT = process.cwd();

/** The three data modules, and anything that would be a fourth. */
const CONTENT_IMPORT = /from\s+['"](?:@\/)?prisma\/seeds\/app-beatbreaker\/data\//;

/**
 * Symbols that named the old compiled-in tables. A file that still exports or
 * imports one of these under `lib/` or `components/` has a copy of the content.
 */
const OLD_TABLE_SYMBOLS = ['STYLES', 'STYLE_KEYS', 'STYLE_GROUPS', 'LIBRARY', 'KITS', 'KIT_KEYS'];

const SEARCHED = ['lib/app', 'components/app', 'app'];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else if (/\.tsx?$/.test(name)) out.push(abs);
  }
  return out;
}

const FILES = SEARCHED.flatMap((dir) => walk(join(ROOT, dir))).map((abs) => ({
  path: relative(ROOT, abs),
  source: readFileSync(abs, 'utf8'),
}));

describe('the catalogue is data, not code', () => {
  it('finds the files it is meant to be searching', () => {
    /* Without this, a wrong path or a changed folder layout would make every
       assertion below vacuously true — the classic green bar that is really a
       check that could not look. */
    expect(FILES.length).toBeGreaterThan(50);
    expect(FILES.some((f) => f.path === 'lib/app/breaks/generate.ts')).toBe(true);
    expect(FILES.some((f) => f.path.startsWith('components/app/studio/'))).toBe(true);
  });

  it('has no application code importing the seed data files', () => {
    const offenders = FILES.filter((f) => CONTENT_IMPORT.test(f.source)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('has no application code declaring a style, library or kit table of its own', () => {
    /* `export const STYLES = ...` and friends. An `import { STYLES }` cannot
       resolve any more — there is nowhere under `lib/` that exports one — so
       what this catches is somebody pasting the table back in. */
    const offenders: string[] = [];
    for (const { path, source } of FILES) {
      for (const symbol of OLD_TABLE_SYMBOLS) {
        if (new RegExp(`export\\s+const\\s+${symbol}\\b`).test(source)) {
          offenders.push(`${path} exports ${symbol}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the seed data reachable only from the seed', () => {
    /* The other half of the rule: the data files exist and hold what the
       catalogue is seeded from. A refactor that emptied them would pass every
       check above by making the thing being guarded disappear. */
    const data = join(ROOT, 'prisma/seeds/app-beatbreaker/data');
    const files = readdirSync(data).sort();
    expect(files).toEqual(['kits.ts', 'library.ts', 'styles.ts']);
  });
});
