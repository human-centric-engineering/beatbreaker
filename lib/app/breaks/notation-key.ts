import { type Engraving, engrave } from '@/lib/app/breaks/engrave';
import { LANE_VALUES } from '@/lib/app/breaks/lanes';
import { emptyBar } from '@/lib/app/breaks/pattern';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';

/**
 * The notation key `/help` shows (9-iv): every value every lane can hold,
 * engraved by the engraver itself, so the key cannot drift from the chart.
 *
 * One bar of 4/4 per family of drums, a value on each eighth note in the
 * order the picker lists them — eight at most, which the snare fills — and
 * their names in the same order beneath.
 */

export interface KeyRow {
  title: string;
  engraving: Engraving;
  /** What each note in the bar is, left to right. */
  names: string[];
}

interface Entry {
  lane: LaneKey;
  value: number;
  name: string;
}

const FAMILIES: Array<{
  title: string;
  lanes: LaneKey[];
  names?: Partial<Record<LaneKey, string>>;
}> = [
  { title: 'Snare', lanes: ['s'] },
  { title: 'Hi-hat', lanes: ['h', 'hf'], names: { hf: 'foot chick' } },
  { title: 'Ride and crashes', lanes: ['r', 'c'] },
  {
    title: 'Kick and toms',
    lanes: ['k', 't1', 't2', 't3'],
    names: { k: 'kick', t1: 'high tom', t2: 'mid tom', t3: 'floor tom' },
  },
];

/** The entries a family shows: every value of every lane in it, toms' accents and flams once. */
function entriesOf(lanes: LaneKey[], names: Partial<Record<LaneKey, string>> = {}): Entry[] {
  const out: Entry[] = [];
  for (const lane of lanes) {
    const values = LANE_VALUES[lane];
    if (lane === 't1' || lane === 't3') {
      // one hit on each tom shows where it sits; the mid tom shows its accent and flam
      out.push({ lane, value: 1, name: names[lane] ?? lane });
      continue;
    }
    values.forEach((label, i) => {
      const prefix = names[lane];
      out.push({
        lane,
        value: i + 1,
        name: prefix
          ? label === 'hit' || values.length === 1
            ? prefix
            : `${prefix} ${label}`
          : label,
      });
    });
  }
  return out;
}

function barOf(entries: Entry[]): Pattern {
  const bar = emptyBar(16);
  entries.forEach((e, i) => {
    bar[e.lane][i * 2] = e.value;
  });
  return {
    name: 'key',
    style: 'key',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 0,
    voice: 'hat',
    lanes: ['k', 's', 'h', 'r', 'c', 't1', 't2', 't3', 'hf'],
    perc: {},
    backbeats: [],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    bars: [bar],
  };
}

export function notationKey(scale = 0.9): KeyRow[] {
  return FAMILIES.map(({ title, lanes, names }) => {
    const entries = entriesOf(lanes, names);
    const e = engrave(barOf(entries), null, { scale, perSystem: 1, rests: false });
    return {
      title,
      engraving: { ...e, label: `${title}: ${entries.map((x) => x.name).join(', ')}` },
      names: entries.map((x) => x.name),
    };
  });
}
