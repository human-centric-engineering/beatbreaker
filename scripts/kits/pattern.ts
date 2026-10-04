/**
 * A recipe's path pattern against a source's file list. Pure.
 *
 * `Samples/{mic}/snare/{mic}_snare_center_vl*.flac` with mics `mid` and `oh`
 * finds every centre stroke on the `mid` mic, and for each one names the same
 * stroke on `oh` — the `*` parts held, the `{mic}` parts swapped.
 */

export interface Candidate {
  /** The stroke, named by its path on the recipe's first mic. */
  id: string;
  /** Each mic's file for this stroke, with its weight. */
  files: Array<{ path: string; weight: number }>;
}

const escape = (s: string): string => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** The pattern with one mic filled in, as a regex whose groups are the `*` parts. */
function matcher(pattern: string, mic: string): RegExp {
  const parts = pattern.replaceAll('{mic}', mic).split('*').map(escape);
  return new RegExp(`^${parts.join('([^/]*)')}$`);
}

/** Fill the `*` parts back in, in order. */
function fill(pattern: string, mic: string, stars: string[]): string {
  let i = 0;
  return pattern.replaceAll('{mic}', mic).replace(/\*/g, () => stars[i++] ?? '');
}

/**
 * Every stroke the pattern matches, in path order, with each mic's file. A
 * stroke missing on any mic is left out rather than mixed short.
 */
export function candidates(
  paths: readonly string[],
  pattern: string,
  mics: Record<string, number>,
  exclude?: RegExp
): Candidate[] {
  const micNames = Object.keys(mics);
  if (!micNames.length) throw new Error(`no mics for ${pattern}`);
  if (micNames.length > 1 && !pattern.includes('{mic}')) {
    throw new Error(`${pattern} names several mics but has no {mic} in it`);
  }
  const have = new Set(paths);
  const [first] = micNames;
  const re = matcher(pattern, first);
  const out: Candidate[] = [];
  for (const path of [...paths].sort()) {
    const m = re.exec(path);
    if (!m || exclude?.test(path)) continue;
    const stars = m.slice(1);
    const files = micNames.map((mic) => ({ path: fill(pattern, mic, stars), weight: mics[mic] }));
    if (files.every((f) => have.has(f.path))) out.push({ id: path, files });
  }
  return out;
}
