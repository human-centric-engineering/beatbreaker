/**
 * The song audit's first pass (Phase 16-a): the facts about every drummer's
 * songs that show where the old limits may have bent one.
 *
 *   npm run songs:audit                 # writes the scan to the default path
 *   npm run songs:audit -- --out <file> # or to another
 *
 * Reads only; changes no song. For each song in `STYLES` it records its
 * sections, the bars of each and whether they are written or generated, the
 * distinct bars and the arrangement's slots, runs of eight-bar sections under
 * one label, adjacent sections that differ only in grid or meter, the aliases
 * left from split songs, the Songsterr tabs its comment cites, the lines of its
 * comments that say a part was cut, rounded or left out, and the date its lines
 * were last changed, so the cap in force when it was built is known.
 *
 * The scan is not the audit. Its flags are where to look; the comment and the
 * tab decide whether a limit changed what the song plays (D81), and that call
 * goes in the ledger, `scripts/songs/audit.json`.
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { meterOf } from '@/lib/app/breaks/meter';
import type { SongSection, StyleSong } from '@/lib/app/breaks/types';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';

const SOURCE = 'prisma/seeds/app-beatbreaker/data/styles.ts';
const DEFAULT_OUT = 'scripts/songs/audit-scan.json';

/** The caps a song was built under, by the date they changed (D79's table). */
const CAPS: Array<{ from: string; cap: string }> = [
  { from: '0000-00-00', cap: 'before sections: 8 bars a song part' },
  { from: '2026-10-12', cap: '32 bars, 16 slots' },
  { from: '2026-10-18', cap: '32 bars, 32 slots' },
  { from: '2026-10-31', cap: '128 bars, 128 slots' },
];

/** Words in a comment that say the song may not be the record as played. */
const HINTS =
  /\b(rounded|round(?:s|ing)? (?:to|onto)|to fit|left out|leaves? out|(?<!album )cut|first \d+ bars|double[- ]time|split|short of|holds? (?:32|26|16|8)|nearest (?:sixteenth|16th|eighth)|instead of|dropped|omitted|no room|too long|too many|laid out in \d+|\d+ bars of (?:its|the record's) \d+|(?:eight|8) bars at most|at most (?:eight|8) bars|backbeat in every bar|\d+ (?:of|for) (?:its |the record's )?\d+ bars|\d+ bars? (?:of|for) \d+|needs? (?:its|the) time)\b/i;

const OPEN_BRACE = /^\s*\{\s*$/;
const STYLE_HEAD = /^ {2}(?:'[\w-]+'|[\w]+): \{$/;

interface SectionFacts {
  letter: string;
  label: string;
  bars: number | null;
  written: boolean;
  meter: string;
  tempoRatio?: number;
  aliases?: string[];
}

interface SongFacts {
  drummer: string;
  drummerLabel: string;
  key: string;
  title: string;
  lines: [number, number];
  /** The day its key line went in: when it was first built. */
  added: string | null;
  lastChanged: string | null;
  /** The caps in force the day it was added; a later edit may not have revisited its bars. */
  capWhenAdded: string | null;
  capWhenLastChanged: string | null;
  written: 'all' | 'some' | 'none';
  sections: SectionFacts[];
  distinctBars: number | null;
  slots: number;
  playedBars: number | null;
  tabs: string[];
  flags: string[];
  hints: Array<{ line: number; text: string }>;
}

function sectionFacts(song: StyleSong, sec: SongSection): SectionFacts {
  const bars = sec.bars ?? sec.written?.length ?? null;
  return {
    letter: sec.letter,
    label: sec.label,
    bars,
    written: Boolean(sec.written?.length),
    meter: sec.params.meter ?? song.params.meter ?? '4/4',
    ...(sec.tempoRatio !== undefined ? { tempoRatio: sec.tempoRatio } : {}),
    ...(sec.aliases?.length ? { aliases: sec.aliases } : {}),
  };
}

/** A label without its numbering, so "the verse (2)" and "the verse, bars 9–16" match. */
function stem(label: string): string {
  return label
    .toLowerCase()
    .split(/[:,(;]/)[0]
    .replace(
      /\b(again|continued|cont\.?|part \d+|\d+(st|nd|rd|th)?|first|second|third|last)\b/g,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/** The grid a meter key holds the bar on, and the bar's own meter: '4/4-6' is 4/4 in sextuplets. */
function gridOf(meter: string): { base: string; grid: string } {
  const m = meterOf(meter);
  const [base, grid] = meter.split('-');
  return { base: m ? base : meter, grid: grid ?? '' };
}

function flagsOf(
  sections: SectionFacts[],
  song: StyleSong,
  playedBars: number | null,
  distinct: number | null
): string[] {
  const flags: string[] = [];
  if (sections.length >= 24) flags.push(`${sections.length} sections`);
  if (playedBars !== null && playedBars >= 110) flags.push(`${playedBars} bars played`);
  const eights = sections.filter((s) => s.bars === 8).length;
  if (eights >= 3) flags.push(`${eights} sections of exactly 8 bars`);
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1];
    const b = sections[i];
    if (a.bars === 8 && b.bars !== null && stem(a.label) === stem(b.label)) {
      flags.push(`${a.letter}→${b.letter}: an 8-bar run under one label ("${stem(a.label)}")`);
    }
    const ga = gridOf(a.meter);
    const gb = gridOf(b.meter);
    if (a.meter !== b.meter && ga.base === gb.base) {
      flags.push(
        `${a.letter}→${b.letter}: same meter ${ga.base}, grid ${ga.grid || '16'}→${gb.grid || '16'}`
      );
    } else if (a.meter !== b.meter && (b.bars ?? 0) <= 2) {
      flags.push(`${b.letter}: a ${b.bars}-bar section in ${b.meter} between ${a.meter} parts`);
    }
  }
  if (distinct === 32) flags.push('exactly 32 distinct bars: the old cap');
  if (song.arrangement?.length === 32 || song.arrangement?.length === 16) {
    flags.push(`exactly ${song.arrangement.length} slots: the old cap`);
  }
  if (sections.some((s) => s.aliases)) flags.push('aliases from a split song');
  if (sections.length && song.arrangement && song.arrangement.length >= 30) {
    flags.push(`${song.arrangement.length} arrangement slots`);
  }
  return flags;
}

/** Where each song's text sits in the source: from its opening brace to the next song's, inside its style. */
function songRanges(lines: string[]): Map<string, { range: [number, number]; keyLine: number }> {
  const out = new Map<string, { range: [number, number]; keyLine: number }>();
  const styleStarts: number[] = [];
  lines.forEach((l, i) => STYLE_HEAD.test(l) && styleStarts.push(i));
  const styleEnd = (i: number) => styleStarts.find((s) => s > i) ?? lines.length;
  const keys: Array<{ key: string; start: number; keyLine: number; style: string }> = [];
  let style = '';
  lines.forEach((l, i) => {
    if (STYLE_HEAD.test(l)) style = l.trim().replace(/['{:\s]/g, '');
    const m = /^ {8}key: '([^']+)',$/.exec(l);
    if (!m) return;
    let start = i;
    while (start > 0 && !OPEN_BRACE.test(lines[start - 1])) start--;
    /* A comment written above the brace belongs to this song, not the one before. */
    if (start > 1 && lines[start - 2].trim().endsWith('*/')) {
      let top = start - 2;
      while (top > 0 && !lines[top].includes('/*')) top--;
      start = top + 1;
    }
    keys.push({ key: `${style}/${m[1]}`, start: start - 1, keyLine: i + 1, style });
  });
  keys.forEach((k, n) => {
    const next = keys[n + 1];
    const end = next && next.style === k.style ? next.start : styleEnd(k.start);
    out.set(k.key, { range: [k.start + 1, end], keyLine: k.keyLine });
  });
  return out;
}

/** The newest commit date over each line, from one blame of the file. */
function lineDates(): string[] {
  const raw = execFileSync('git', ['blame', '-M', '-w', '--porcelain', SOURCE], {
    maxBuffer: 1 << 30,
    encoding: 'utf8',
  });
  const times = new Map<string, number>();
  const dates: string[] = [];
  let sha = '';
  let final = 0;
  for (const l of raw.split('\n')) {
    const head = /^([0-9a-f]{40}) \d+ (\d+)/.exec(l);
    if (head) {
      sha = head[1];
      final = Number(head[2]);
      continue;
    }
    if (l.startsWith('committer-time ')) times.set(sha, Number(l.slice(15)));
    else if (l.startsWith('\t')) {
      const t = times.get(sha);
      dates[final - 1] = t ? new Date(t * 1000).toISOString().slice(0, 10) : '';
    }
  }
  return dates;
}

function capOn(date: string | null): string | null {
  if (!date) return null;
  return [...CAPS].reverse().find((c) => date >= c.from)?.cap ?? null;
}

function main(): void {
  const at = process.argv.indexOf('--out');
  const out = at > 0 ? process.argv[at + 1] : DEFAULT_OUT;
  const lines = readFileSync(join(process.cwd(), SOURCE), 'utf8').split('\n');
  const ranges = songRanges(lines);
  const dates = lineDates();
  const songs: SongFacts[] = [];

  for (const [drummer, st] of Object.entries(STYLES)) {
    if (!st.drummer || !st.songs) continue;
    for (const song of st.songs) {
      const found = ranges.get(`${drummer}/${song.key}`);
      const range: [number, number] = found?.range ?? [0, 0];
      const added = found ? dates[found.keyLine - 1] || null : null;
      const text = lines.slice(range[0] - 1, range[1]);
      const sections = (song.sections ?? []).map((s) => sectionFacts(song, s));
      const byLetter = new Map(sections.map((s) => [s.letter, s.bars]));
      const order = song.arrangement ?? sections.map((s) => s.letter);
      const counts = order.map((l) => byLetter.get(l) ?? null);
      const playedBars = counts.some((c) => c === null)
        ? null
        : counts.reduce<number>((a, c) => a + (c ?? 0), 0);
      const distinct = sections.some((s) => s.bars === null)
        ? null
        : sections.reduce((a, s) => a + (s.bars ?? 0), 0);
      const writtenCount = sections.filter((s) => s.written).length;
      const lastChanged =
        dates
          .slice(range[0] - 1, range[1])
          .filter(Boolean)
          .sort()
          .pop() ?? null;
      songs.push({
        drummer,
        drummerLabel: st.label,
        key: song.key,
        title: song.title,
        lines: range,
        added,
        lastChanged,
        capWhenAdded: capOn(added),
        capWhenLastChanged: capOn(lastChanged),
        written: writtenCount === 0 ? 'none' : writtenCount === sections.length ? 'all' : 'some',
        sections,
        distinctBars: distinct,
        slots: order.length,
        playedBars,
        tabs: [
          ...new Set(
            [...text.join('\n').matchAll(/Songsterr\s+(?:tabs?\s+)?\(?(\d+)/g)].map(
              (m) => `Songsterr ${m[1]}`
            )
          ),
        ],
        flags: flagsOf(sections, song, playedBars, distinct),
        hints: text
          .map((t, i) => ({ line: range[0] + i, text: t.trim() }))
          .filter((h) => HINTS.test(h.text)),
      });
    }
  }

  writeFileSync(
    out,
    JSON.stringify({ generated: new Date().toISOString(), songs }, null, 1) + '\n'
  );
  const flagged = songs.filter((s) => s.flags.length || s.hints.length);
  process.stdout.write(
    `${songs.length} songs on ${new Set(songs.map((s) => s.drummer)).size} drummers; ` +
      `${flagged.length} flagged or with a hint; ` +
      `max sections ${Math.max(...songs.map((s) => s.sections.length))}; wrote ${out}\n`
  );
}

main();
