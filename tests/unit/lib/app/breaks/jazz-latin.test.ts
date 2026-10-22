/**
 * The four drummers of 11-d — Elvin Jones, Tito Puente, Changuito and Horacio
 * Hernández — and three of 12-f, Max Roach, Ari Hoenig and Dafnis Prieto: each
 * filed with his family, every one of his songs writing, at its own tempo, a
 * break the critic passes, and every Latin song keeping the clave its record
 * names, in every bar it writes. What a song writes by hand needs no more than
 * two hands with its percussion under it, and Elvin's compound-time songs stay
 * on the triplet grid his record asks for.
 *
 * `song-tempo.test.ts` holds every drummer's merged range to `playableBpm`,
 * but the merge has already cut it down, so a range written wider than its
 * runs allow passes there. Here the range as written must need no cutting.
 * Bar lengths for every drummer are held in `songs.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { generateGood, playability } from '@/lib/app/breaks/critic';
import { generatePattern } from '@/lib/app/breaks/generate';
import { PERC_LANES, handLanes, handsAt, percRoster } from '@/lib/app/breaks/lanes';
import { meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { makeRng } from '@/lib/app/breaks/rng';
import { playableBpm, songMeter, songTempo, withSong } from '@/lib/app/breaks/songs';
import type { Figure, LaneKey, Pattern } from '@/lib/app/breaks/types';
import { STYLES, STYLE_GROUPS } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

const FAMILIES: Record<string, string> = {
  elvinjones: 'Modal and post-bop drummers',
  puente: 'Afro-Cuban and Latin jazz drummers',
  changuito: 'Afro-Cuban and Latin jazz drummers',
  horaciohernandez: 'Afro-Cuban and Latin jazz drummers',
  roach: 'Bebop drummers',
  hoenig: 'Modern jazz drummers',
  prieto: 'Afro-Cuban and Latin jazz drummers',
};

/* One 4/4 bar of sixteenths holds one whole clave, as in the Afro-Latin
   genres; the records' two-bar grids of eighths are the same sixteen pulses. */
const CLAVE = {
  'son 3-2': [0, 3, 6, 10, 12],
  'son 2-3': [2, 4, 8, 11, 14],
  'rumba 3-2': [0, 3, 7, 10, 12],
  'rumba 2-3': [2, 4, 8, 11, 15],
  // in 12/8: the 6/8 clave, written in sixteenths
  '6/8': [0, 4, 8, 14, 18],
} as const;

/* The cáscara turns with the clave: its busy half on the clave's three side. */
const CASCARA = {
  '3-2': [0, 2, 4, 5, 7, 8, 10, 11, 13, 15],
  '2-3': [0, 2, 3, 5, 7, 8, 10, 12, 13, 15],
} as const;

type Clave = keyof typeof CLAVE;

/**
 * `style/song` → the clave its record or its research names, and whether the
 * cáscara is over it. Null is a song with no clave: Hernández with Santana.
 * Sources are in `drumming-research.md`, §Q–S.
 */
const LATIN: Record<string, { clave: Clave | null; cascara?: boolean }> = {
  // Puente: son 2-3 on claves, his record's default
  'puente/oye-como-va': { clave: 'son 2-3' },
  'puente/ran-kan-kan': { clave: 'son 2-3' },
  'puente/el-cayuco': { clave: 'son 2-3', cascara: true },
  'puente/complicacion': { clave: 'son 2-3', cascara: true },
  'puente/3-d-mambo': { clave: 'son 2-3' },
  'puente/hong-kong-mambo': { clave: 'son 2-3' },
  'puente/mambo-gozon': { clave: 'son 2-3' },
  'puente/babarabatiri': { clave: 'son 2-3', cascara: true },
  'puente/picadillo': { clave: 'son 2-3' },
  'puente/para-los-rumberos': { clave: 'son 2-3' },
  'puente/mambo-diablo': { clave: 'son 2-3', cascara: true },
  // Changuito: rumba 2-3 under songo, as Kevin Moore's grids have it
  'changuito/chirrin-chirran': { clave: 'rumba 2-3' },
  'changuito/la-habana-joven': { clave: 'rumba 2-3' },
  'changuito/llegue-llegue': { clave: 'rumba 2-3' },
  'changuito/mi-ritmo-caliente': { clave: 'rumba 2-3' },
  'changuito/y-que-se-sepa': { clave: 'rumba 2-3' },
  'changuito/te-traigo': { clave: 'rumba 2-3' },
  'changuito/dale-dos': { clave: 'rumba 2-3' },
  'changuito/tu-decision': { clave: 'rumba 3-2' },
  'changuito/por-que-lo-haces': { clave: 'rumba 2-3' },
  'changuito/no-digas-que-no': { clave: 'rumba 2-3' },
  'changuito/buey-cansao': { clave: 'rumba 2-3' },
  'changuito/sandunguera': { clave: 'rumba 2-3' },
  // Hernández: the clave his left foot plays, on the claves slot
  'horaciohernandez/africa-bamba': { clave: null },
  'horaciohernandez/you-are-my-kind': { clave: null },
  'horaciohernandez/mambo-for-roy': { clave: 'son 2-3' },
  'horaciohernandez/afrodisia': { clave: 'rumba 2-3', cascara: true },
  'horaciohernandez/afro-blue': { clave: '6/8' },
  'horaciohernandez/la-comparsa': { clave: 'son 2-3' },
  'horaciohernandez/night-in-torino': { clave: 'rumba 2-3' },
  'horaciohernandez/que-negro-esta': { clave: 'son 3-2' },
  // Prieto: the clave his lesson writes, on the claves; Blah Blah Blah has none
  'prieto/blah-blah-blah': { clave: null },
  'prieto/una-vez-mas': { clave: 'rumba 3-2' },
  'prieto/song-for-chico': { clave: 'rumba 2-3', cascara: true },
  'prieto/the-triumphant-journey': { clave: '6/8' },
};

/** The steps a percussion slot holding `inst` plays in a bar, or null with no such slot. */
function slotSteps(pat: Pattern, inst: string, bar: number): number[] | null {
  const lane = PERC_LANES.find((L) => pat.perc[L] === inst && pat.lanes.includes(L));
  if (!lane) return null;
  return pat.bars[bar][lane].flatMap((v, i) => (v ? [i] : []));
}

describe.each(Object.keys(FAMILIES))('%s', (key) => {
  const resolved = testStyle(key);
  const st = resolved.params;
  const songs = st.songs ?? [];

  it('is a drummer, filed with his family', () => {
    expect(STYLES[key].drummer).toBe(true);
    const group = STYLE_GROUPS.find(([, keys]) => keys.includes(key));
    expect(group?.[0]).toBe(FAMILIES[key]);
    expect(songs.length).toBeGreaterThan(0);
  });

  it('gives every song a tempo range its runs allow, so none is cut down', () => {
    for (const song of songs) {
      const asWritten = { ...st, ...song.params };
      expect(playableBpm(asWritten), song.key).toEqual(asWritten.bpm);
    }
  });

  /* `fitHands` would quietly drop a note from a bar that asks for three hands,
     so a figure written that way never plays as written; the critic cannot
     see it. Each bar here is the figure with the song's percussion slots
     under it, as `writePerc` lays them. */
  it('writes no bar that needs three hands with its percussion under it', () => {
    for (const song of songs) {
      const merged = withSong(st, song.key);
      const n = stepsOf(meterOf(songMeter(st, song)));
      const hands = handLanes(percRoster(merged));
      for (const [figure] of merged.figures ?? []) {
        const rows = Object.entries(figure) as Array<[LaneKey, string]>;
        for (let bar = 0; bar * n < (rows[0]?.[1].length ?? 0); bar++) {
          const b = emptyBar(n);
          for (const [lane, row] of rows)
            for (let i = 0; i < n; i++)
              b[lane][i] = row[bar * n + i] === '.' ? 0 : Number(row[bar * n + i]);
          (merged.perc ?? []).forEach((spec, li) => {
            for (const i of spec.steps ?? []) if (i < n) b[PERC_LANES[li]][i] ||= 1;
          });
          for (let i = 0; i < n; i++)
            expect(handsAt(b, i, hands), `${song.key}, step ${i}`).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('writes a break the critic passes in every song, at its own tempo', () => {
    const rng = makeRng(7);
    for (const song of songs) {
      for (const seed of [1, 2]) {
        const bpm = songTempo(st, song, rng);
        const res = generateGood(
          { style: resolved, song: song.key, seed, bars: 4, density: 50, ghosts: 50 },
          bpm
        );
        // a song in sections records the section it wrote, as `blah-blah-blah:A`
        expect(res.pattern.song?.split(':')[0]).toBe(song.key);
        expect(res.pattern.meter).toBe(songMeter(st, song));
        expect(playability(res.pattern, bpm).hard, `${song.key} at ${bpm}`).toBe(true);
      }
    }
  });
});

describe('Elvin Jones in compound time', () => {
  /* "Triplet grid; never straight 16ths" (his record). In 9/8 and 12/8 a step
     is a sixteenth, so a triplet eighth is an even step. The one other place a
     note may fall is half way through the bar: the second beat of the 6/8
     hemiola he lays over the waltz. A fill is right-aligned to the bar's end,
     so its row's length decides where it lands. */
  it('writes every figure and fill note on a triplet eighth or the hemiola', () => {
    const st = STYLES.elvinjones;
    for (const song of st.songs ?? []) {
      const meter = songMeter(st, song);
      if (meter !== '9/8' && meter !== '12/8') continue;
      const n = stepsOf(meterOf(meter));
      const merged = withSong(st, song.key);
      const odd = (f: Figure, from: number) =>
        Object.entries(f).flatMap(([lane, row]) =>
          [...(row ?? '')].flatMap((c, i) =>
            c !== '.' && (from + i) % 2 && from + i !== n / 2 ? [`${lane}@${from + i}`] : []
          )
        );
      for (const [f] of merged.figures ?? []) expect(odd(f, 0), `${song.key} figure`).toEqual([]);
      for (const [f] of merged.fills ?? []) {
        const len = Math.max(...Object.values(f).map((r) => r?.length ?? 0));
        expect(odd(f, n - len), `${song.key} fill`).toEqual([]);
      }
    }
  });
});

describe('the Latin songs’ clave', () => {
  const latin = ['puente', 'changuito', 'horaciohernandez', 'prieto'];

  it('names every song of the four Latin drummers, and nothing else', () => {
    const all = latin.flatMap((key) => (STYLES[key].songs ?? []).map((s) => `${key}/${s.key}`));
    expect(Object.keys(LATIN).sort()).toEqual(all.sort());
  });

  it.each(Object.entries(LATIN))(
    '%s keeps its clave, and its cáscara turns with it, in every bar',
    (where, { clave, cascara }) => {
      const [key, song] = where.split('/');
      for (const seed of [1, 2, 3]) {
        const pat = generatePattern({
          style: testStyle(key),
          song,
          seed,
          bars: 4,
          density: 50,
          ghosts: 50,
        });
        for (let b = 0; b < pat.bars.length; b++) {
          if (!clave) {
            expect(slotSteps(pat, 'clave', b), where).toBeNull();
            continue;
          }
          expect(slotSteps(pat, 'clave', b), `${where} bar ${b + 1}`).toEqual([...CLAVE[clave]]);
          if (!cascara) continue;
          /* The cáscara is a hand on the kit: a fill takes it from where the
             fill starts, so bar 1, which no fill reaches, has all of it, and
             every bar has nothing off it. */
          const want: readonly number[] = CASCARA[clave.endsWith('3-2') ? '3-2' : '2-3'];
          const got = slotSteps(pat, 'cascara', b) ?? [];
          if (b === 0) expect(got, `${where} cáscara`).toEqual([...want]);
          expect(
            got.filter((i) => !want.includes(i)),
            `${where} cáscara, bar ${b + 1}`
          ).toEqual([]);
        }
      }
    }
  );
});
