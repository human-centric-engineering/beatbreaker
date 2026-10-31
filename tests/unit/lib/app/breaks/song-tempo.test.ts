/**
 * A song plays at the record's tempo, and what it writes can be played there
 * by two hands and two feet. There is no cap on how fast a run may go beyond
 * what a body can do (`limbProblems`): a song held below its record to keep a
 * run under a number was not the record.
 */

import { describe, expect, it } from 'vitest';

import { applyFigureFill, figureBars, generatePattern } from '@/lib/app/breaks/generate';
import { stepsOf, meterOf } from '@/lib/app/breaks/meter';
import { limbProblems } from '@/lib/app/breaks/physical';
import { partKey, songBpm, songParts, songTempo, withSong } from '@/lib/app/breaks/songs';
import { makeRng } from '@/lib/app/breaks/rng';
import type { Bar, Pattern } from '@/lib/app/breaks/types';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testStyle } from '@/tests/helpers/catalogue';

describe('a song’s tempo', () => {
  it('is drawn from the song’s range, as the record has it', () => {
    const bonham = testStyle('bonham').params;
    const song = bonham.songs!.find((s) => s.key === 'rock-and-roll');
    const [lo, hi] = withSong(bonham, 'rock-and-roll').bpm;
    const rng = makeRng(1);
    for (let i = 0; i < 50; i++) {
      const bpm = songTempo(bonham, song, rng);
      expect(bpm).toBeGreaterThanOrEqual(lo);
      expect(bpm).toBeLessThanOrEqual(hi);
    }
  });

  it('asks nothing of any drummer’s song that two hands and two feet cannot play at its top tempo', () => {
    const seen = new Set<string>();
    const failures: string[] = [];
    for (const key of Object.keys(STYLES).filter((k) => STYLES[k].drummer)) {
      const style = testStyle(key);
      for (const { song, section } of songParts(style.params)) {
        const part = partKey(song, section);
        const merged = withSong(style.params, part);
        const n = stepsOf(meterOf(merged.meter));
        const bpm = songBpm(style.params, song)[1];
        // the pattern's lanes, kit and feel, from the song itself
        const shell = generatePattern({
          style,
          song: part,
          seed: 1,
          bars: 1,
          density: 50,
          ghosts: 50,
        });
        // a written section is its bars, in order, played round
        const loops: Bar[][] = section?.written ? [shell.bars] : [];
        for (const [f] of section?.written ? [] : (merged.figures ?? [])) {
          const bars = figureBars(f, n);
          loops.push(bars);
          // each fill over the last bar of each groove, the groove coming round after it
          for (const [fill] of merged.fills ?? [])
            loops.push([...bars.slice(0, -1), applyFigureFill(bars[bars.length - 1], fill)]);
        }
        for (const bars of loops) {
          const pat: Pattern = {
            ...shell,
            bars,
            fills: undefined,
            tuplets: undefined,
            polySpans: undefined,
          };
          const id = `${JSON.stringify(bars)}|${bpm}|${pat.tempoRatio ?? 1}|${JSON.stringify(pat.attrs)}`;
          if (seen.has(id)) continue;
          seen.add(id);
          const problems = limbProblems(pat, bpm);
          if (problems.length)
            failures.push(
              `${key} ${part} at ${bpm}: ${problems.map((p) => `${p.limbs}, ${p.why}`).join('; ')}`
            );
        }
      }
    }
    expect(failures).toEqual([]);
  }, 300_000);
});
