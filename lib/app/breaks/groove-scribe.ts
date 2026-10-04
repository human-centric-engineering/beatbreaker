import { type ImportResult, MAX_IMPORT_BARS } from '@/lib/app/breaks/import';
import { BUZZ, DRAG, FLAM } from '@/lib/app/breaks/lanes';
import { METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { Bar, LaneKey, PercLaneKey } from '@/lib/app/breaks/types';

/**
 * Read a Groove Scribe link. The whole groove is in the URL's query string, so
 * nothing is fetched — the link is parsed as text (§6, _Reading patterns in_).
 *
 * Groove Scribe (github.com/montulli/GrooveScribe) writes one tab line per
 * voice — `H` hi-hat and cymbals, `S` snare, `K` kick and hi-hat foot,
 * `T1`–`T4` toms — plus `TimeSig`, `Div` (notes per whole note), `measures`,
 * `tempo`, `swing` and `title`. This reads them the way its own
 * `getGrooveDataFromUrlString` does: keys are case-insensitive, `|` and a few
 * other layout characters are ignored, and a line written at a coarser or finer
 * grid than `Div` is stretched or thinned by a whole factor.
 *
 * Its snare flams, drags and buzzes (`f`, `d`, `b`) read as BeatBreaker's own
 * (9-iv); before, they flattened to plain hits. It has no rimshot or half-open
 * hat to read.
 *
 * BeatBreaker's grid is sixteenths, so an eighth-note groove is spread out and
 * a 32nd-note one thinned — the notes between sixteenths are reported, not
 * guessed at. Triplet grids (`Div` 12, 24, 48) have no sixteenth equivalent and
 * are refused with a reason.
 */

/** Where Groove Scribe is hosted. Any other host is not a Groove Scribe link. */
export const GROOVE_SCRIBE_HOSTS = [
  'www.mikeslessons.com',
  'mikeslessons.com',
  'montulli.github.io',
];

/** Groove Scribe's default tempo, used when the link's is missing or out of range. */
const DEFAULT_TEMPO = 80;

type Hit = Array<[LaneKey, number]>;

/** Tab character → what it plays, per voice line. `null` is a character that is deliberately silent. */
const HH: Record<string, Hit | null> = {
  x: [['h', 1]],
  X: [['h', 2]],
  o: [['h', 3]],
  '+': [['h', 1]], // closed after an open hat — a closed stroke
  c: [['c', 1]],
  r: [['r', 1]],
  b: [['r', 2]],
  m: [['p1', 1]], // cowbell, into a percussion slot
  n: null, // metronome clicks are not part of the groove
  N: null,
};
const SNARE: Record<string, Hit> = {
  o: [['s', 2]],
  O: [['s', 3]],
  g: [['s', 1]],
  x: [['s', 4]],
  f: [['s', FLAM]],
  d: [['s', DRAG]],
  b: [['s', BUZZ]],
};
const KICK: Record<string, Hit> = {
  o: [['k', 1]],
  x: [['hf', 1]],
  X: [
    ['k', 1],
    ['hf', 1],
  ],
};
const TOM = (lane: LaneKey): Record<string, Hit> => ({
  o: [[lane, 1]],
  x: [[lane, 1]],
  O: [[lane, 2]],
  X: [[lane, 2]],
});

/** Groove Scribe's own query reader: first match, key compared without case, value as written. */
function queryValue(search: string, key: string): string | undefined {
  const query = search.startsWith('?') ? search.slice(1) : search;
  for (const pair of query.split('&')) {
    const [k, v] = pair.split('=');
    if (k.toLowerCase() === key.toLowerCase()) return v ?? '';
  }
  return undefined;
}

function decode(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '));
  } catch {
    return v;
  }
}

/**
 * Tab-line decode, the Groove Scribe way: strip layout, then stretch or thin by
 * a whole factor. The factor is decided against the size the link claims
 * (`size`), as Groove Scribe decides it; only the first `keep` cells are built.
 */
function noteArray(raw: string, size: number, keep: number): string[] {
  let notes = raw;
  try {
    notes = decodeURIComponent(raw);
  } catch {
    // leave it as written; a stray % is just an unknown character
  }
  notes = notes.replace(/[:!()[\]|\s]/g, '');
  const out: string[] = Array.from({ length: keep }, () => '-');
  if (!notes.length) return out;
  let take = 1;
  let spread = 1;
  if (notes.length > size && notes.length / size >= 2) take = Math.ceil(notes.length / size);
  else if (notes.length < size && size / notes.length >= 2) spread = Math.ceil(size / notes.length);
  for (let j = 0, at = 0; j < notes.length && at < keep; j += take, at += spread)
    out[at] = notes[j];
  return out;
}

/** Is this a link this reader should be handed? */
export function isGrooveScribeUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      GROOVE_SCRIBE_HOSTS.includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function readGrooveScribeUrl(input: string): ImportResult {
  if (!isGrooveScribeUrl(input)) return { ok: false, error: 'that is not a Groove Scribe link' };
  const search = new URL(input.trim()).search;
  if (!search) return { ok: false, error: 'that Groove Scribe link has no groove in it' };

  const timeSig = decode(queryValue(search, 'TimeSig')) ?? '4/4';
  if (!METERS[timeSig]) {
    return {
      ok: false,
      error: `the groove is in ${timeSig}, and BeatBreaker has ${Object.keys(METERS).join(', ')}`,
    };
  }
  const [num, den] = timeSig.split('/').map(Number);

  const div = parseInt(queryValue(search, 'Div') ?? '16', 10);
  if (!Number.isFinite(div) || div <= 0)
    return { ok: false, error: 'that Groove Scribe link has no note grid (Div)' };
  if (div % 12 === 0) {
    return {
      ok: false,
      error: 'that groove is written in triplets, which the sixteenth-note grid cannot hold',
    };
  }

  const steps = stepsOf(meterOf(timeSig));
  const perMeasure = (div / den) * num;
  if (!Number.isInteger(perMeasure) || (steps % perMeasure !== 0 && perMeasure % steps !== 0)) {
    return {
      ok: false,
      error: `a grid of ${div} notes per whole note does not line up with sixteenths`,
    };
  }

  const measuresRaw = parseInt(queryValue(search, 'measures') ?? '1', 10);
  const claimed = Math.max(Number.isFinite(measuresRaw) ? measuresRaw : 1, 1);
  /* Read no more than a document holds — the link's own number is not a
     reason to allocate. The note says what was there. */
  const measures = Math.min(claimed, MAX_IMPORT_BARS);
  const size = perMeasure * claimed;
  const keep = perMeasure * measures;

  const lines: Array<[string, Record<string, Hit | null>]> = [
    ['H', HH],
    ['S', SNARE],
    ['K', KICK],
    ['T1', TOM('t1')],
    ['T2', TOM('t2')],
    ['T3', TOM('t3')],
    ['T4', TOM('t3')],
  ];

  const bars: Bar[] = Array.from({ length: measures }, () => emptyBar(steps));
  const perc: Partial<Record<PercLaneKey, string>> = {};
  const notes: string[] = [];
  if (claimed > measures) {
    notes.push(
      `Only the first ${measures} of ${claimed} bars were kept — a pattern holds two sections of ${MAX_IMPORT_BARS / 2}.`
    );
  }
  let between = 0;
  let unknown = 0;
  const tomSources = new Set<string>();

  for (const [key, map] of lines) {
    const raw = queryValue(search, key) ?? (key === 'K' ? queryValue(search, 'B') : undefined);
    if (!raw) continue;
    const cells = noteArray(raw, size, keep);
    cells.forEach((ch, idx) => {
      if (ch === '-' || ch === '.' || ch === '_') return;
      const hit = map[ch];
      if (hit === null) return;
      if (!hit) {
        unknown++;
        return;
      }
      const bar = Math.floor(idx / perMeasure);
      const pos = idx % perMeasure;
      // spread a coarse grid out; thin a fine one, counting what falls between sixteenths
      const scaled = (pos * steps) / perMeasure;
      if (!Number.isInteger(scaled)) {
        between++;
        return;
      }
      if (key === 'T3' || key === 'T4') tomSources.add(key);
      for (const [lane, value] of hit) {
        if (lane === 'p1') perc.p1 = 'cowbell';
        bars[bar][lane][scaled] = Math.max(bars[bar][lane][scaled], value);
      }
    });
  }

  if (between)
    notes.push(
      `${between} ${between === 1 ? 'note' : 'notes'} between sixteenths ${between === 1 ? 'was' : 'were'} left out.`
    );
  if (tomSources.size > 1) notes.push('Toms 3 and 4 were both read onto the floor tom.');
  if (unknown)
    notes.push(
      `${unknown} ${unknown === 1 ? 'note' : 'notes'} of a kind BeatBreaker does not have ${unknown === 1 ? 'was' : 'were'} left out.`
    );

  const tempoRaw = parseInt(queryValue(search, 'tempo') ?? '', 10);
  const bpm =
    Number.isFinite(tempoRaw) && tempoRaw >= 20 && tempoRaw <= 400 ? tempoRaw : DEFAULT_TEMPO;
  const swingRaw = parseInt(queryValue(search, 'swing') ?? '0', 10);
  const swing = Number.isFinite(swingRaw) && swingRaw >= 0 && swingRaw <= 100 ? swingRaw : 0;

  return {
    ok: true,
    pattern: {
      name: (decode(queryValue(search, 'title')) ?? '').trim().slice(0, 120),
      meter: timeSig,
      bpm,
      swing,
      bars,
      perc,
      notes,
    },
  };
}
