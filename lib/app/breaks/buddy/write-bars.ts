import { z } from 'zod';

import { type EditData, describeEdit, editWorkspace } from '@/lib/app/breaks/buddy/edit';
import { playability } from '@/lib/app/breaks/critic';
import { DEFAULT_PERC, LANES, PERC_LANES } from '@/lib/app/breaks/lanes';
import { METER_KEYS, meterOf, remapList } from '@/lib/app/breaks/meter';
import { clonePattern } from '@/lib/app/breaks/pattern';
import { type TextBar, fromText, notationKey } from '@/lib/app/breaks/text';
import { type TidyRule, tidy } from '@/lib/app/breaks/tidy';
import type { Bar, Pattern } from '@/lib/app/breaks/types';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `write_bars` — the model writes bars itself, in the text notation, and they
 * replace bars of a section. The route for "a genre you don't have" and for
 * transcribing a photo of notation.
 *
 * **Nothing unplayable gets through.** Each written bar is checked on its
 * own, before anything is written: the critic's hard playability rules, plus
 * the two physical ones `tidy()` knows that the critic does not check — no
 * more than two hands on one step, no foot chick closing an open hat. A bar
 * that fails is refused with the bar, the beat and the rule named, so the
 * model can fix it and try again.
 *
 * Two modes. By default each `bar N` replaces bar N of the section, or adds
 * it when N is one past the end. With `whole`, the bars written become the
 * whole section, and may change its meter — what a transcription needs. A
 * whole-section write also moves the backbeat to where the writing puts it,
 * since the section's old one belonged to a groove that is no longer there.
 */

/** A section's bar limit, from the wire format. */
const MAX_BARS = 8;

const schema = z.object({
  section: z.enum(['A', 'B']),
  text: z.string().min(1).max(8000),
  whole: z.boolean().default(false),
  meter: z
    .string()
    .refine((m) => METER_KEYS.includes(m), 'unknown meter')
    .optional(),
});

type Args = z.infer<typeof schema>;

/** How many problems a refusal names. More than this and the bar needs rewriting, not patching. */
const MAX_PROBLEMS = 6;

/**
 * Why each written bar cannot be played, or an empty list. `pat` is the
 * section as it will be — its backbeat is what each bar is checked against.
 */
function problemsOf(pat: Pattern, written: TextBar[], bpm: number): string[] {
  const problems: string[] = [];
  for (const { number, bar } of written) {
    const alone: Pattern = { ...pat, bars: [bar], pins: null };
    /* tidy() on the bar alone reports its bar as 1; the writer called it N.
       Its ride-clash note names the beat, so it stands in for the critic's. */
    for (const change of tidy(alone).changes) {
      if (PHYSICAL.has(change.rule))
        problems.push(change.note.replace(/^bar 1\b/, `bar ${number}`));
    }
    const checks = playability(alone, bpm);
    if (checks.hard) continue;
    checks.checks.forEach((check, i) => {
      if (!check.ok && HARD_CHECKS.has(i)) problems.push(`bar ${number}: fails "${check.label}"`);
    });
  }
  return problems;
}

/** The tidy rules that are physics rather than taste. */
const PHYSICAL = new Set<TidyRule>(['ride-clash', 'hands', 'open-hat-foot']);

/**
 * Which of `playability()`'s checks are hard, by position: kick run, snare
 * run, backbeat, air. The first (hat and ride) is reported by tidy with its
 * beat named; the last (kick doubles at speed) is advice, not a rule.
 * `write-bars.test.ts` pins this against the critic's labels.
 */
export const HARD_CHECKS = new Set([1, 2, 3, 4]);

/**
 * Where the backbeat is in freshly written bars: the steps a snare hit or
 * accent lands on in more than half of them. More than half, so a fill bar
 * does not move it.
 */
function backbeatsOf(bars: Bar[]): number[] {
  const n = bars[0]?.s.length ?? 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const hits = bars.filter((b) => b.s[i] >= 2).length;
    if (hits * 2 > bars.length) out.push(i);
  }
  return out;
}

type Built = { ok: true; pattern: Pattern } | { ok: false; message: string; code: string };

function build(pat: Pattern, args: Args, bpm: number): Built {
  const meterKey = args.meter ?? pat.meter;
  if (!args.whole && meterKey !== pat.meter) {
    return {
      ok: false,
      message: `Section ${args.section} is in ${pat.meter}. To write it in ${meterKey}, rewrite the whole section with whole: true`,
      code: 'meter_mismatch',
    };
  }

  const read = fromText(args.text, meterKey);
  if (!read.ok) return { ok: false, message: read.error, code: 'bad_notation' };

  const numbers = read.bars.map((b) => b.number).sort((a, b) => a - b);
  const last = numbers[numbers.length - 1];
  if (last > MAX_BARS) {
    return {
      ok: false,
      message: `A section holds at most ${MAX_BARS} bars`,
      code: 'too_many_bars',
    };
  }
  const from = args.whole ? 0 : pat.bars.length;
  const added = numbers.filter((n) => n > from);
  if (added.some((n, i) => n !== from + 1 + i)) {
    return {
      ok: false,
      message: args.whole
        ? 'A whole section is written as bar 1, bar 2 … with none missing'
        : `Section ${args.section} has ${pat.bars.length} bar${pat.bars.length > 1 ? 's' : ''}; new bars go on the end, starting at bar ${pat.bars.length + 1}`,
      code: 'bar_gap',
    };
  }

  const next = clonePattern(pat);
  if (args.whole) {
    next.bars = [...read.bars].sort((a, b) => a.number - b.number).map((b) => b.bar);
    next.meter = meterKey;
    next.pins = null;
    const found = backbeatsOf(next.bars);
    next.backbeats = found.length
      ? found
      : remapList(pat.backbeats, meterOf(pat.meter), meterOf(meterKey));
  } else {
    for (const { number, bar } of read.bars) {
      next.bars[number - 1] = bar;
      // a pin records the layer a note was placed at; these notes are new
      if (next.pins?.[number - 1]) next.pins[number - 1] = undefined;
    }
  }

  /* A lane the writer used is a lane the chart must show, or the notes would
     be there and invisible. Done before the check, so a
     clash involving a newly used lane is seen. */
  const lanes = new Set([...next.lanes, ...read.lanes]);
  next.lanes = LANES.filter((L) => lanes.has(L));
  PERC_LANES.forEach((L, i) => {
    if (next.lanes.includes(L) && !next.perc[L]) next.perc = { ...next.perc, [L]: DEFAULT_PERC[i] };
  });

  const problems = problemsOf(next, read.bars, bpm);
  if (problems.length) {
    const shown = problems.slice(0, MAX_PROBLEMS);
    const more = problems.length - shown.length;
    return {
      ok: false,
      message: `Not playable, nothing written: ${shown.join('; ')}${more > 0 ? `; and ${more} more` : ''}`,
      code: 'unplayable',
    };
  }

  return { ok: true, pattern: next };
}

export class WriteBarsCapability extends BaseCapability<Args, EditData> {
  readonly slug = 'write_bars';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'write_bars',
    description: `Write bars yourself, in the same text notation get_pattern returns, replacing bars of section A or B. Use it for a genre no style covers, for transcribing notation from an image, or for a specific change no doctor move makes. Start each bar with "bar N", then one line per lane: a lane name and one character per 16th step (a bar of 4/4 is 16 steps; spaces and | are ignored, "." is a rest). Lanes and their characters: ${notationKey()}. Flams, drags, buzzes, rimshots, the half-open hat and the crash lane's other cymbals are for when the user asks for them or the notation shows them. A lane you leave out is empty in that bar. By default each bar replaces that bar number (or adds it if it is one past the end). With whole: true the bars become the whole section and meter may change. Every bar is checked before anything is written: no hi-hat and ride together, at most two hands on one step (a flam or drag is both hands), no triple 16ths on the kick, no four 16ths running on the snare, a backbeat in every bar, and a quarter of each bar left as air. A refused bar comes back with the reason; fix it and try again.`,
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: ['A', 'B'], description: 'Which section to write.' },
        text: {
          type: 'string',
          description: 'The bars, in the notation: "bar 1" then a line per lane, and so on.',
        },
        whole: {
          type: 'boolean',
          description:
            'True to replace the whole section with exactly these bars, numbered from 1. Defaults to false.',
        },
        meter: {
          type: 'string',
          enum: METER_KEYS,
          description:
            "Time signature of the bars written. Only with whole: true; defaults to the section's.",
        },
      },
      required: ['section', 'text'],
    },
  };

  protected readonly schema = schema;

  async execute(args: Args, context: CapabilityContext): Promise<CapabilityResult<EditData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    const outcome = await editWorkspace(context.userId, (doc) => {
      const built = build(doc[args.section], args, doc.bpm);
      if (!built.ok) return built;
      return { ok: true, doc: { ...doc, [args.section]: built.pattern }, extra: null };
    });
    if (!outcome.ok) return this.error(outcome.message, outcome.code);

    const described = describeEdit(outcome.before, outcome.after, [args.section]);
    const bars = described.changes[0].bars;
    return this.success({
      doc: outcome.payload,
      rev: outcome.rev,
      summary:
        bars.length === 0
          ? `Wrote ${args.section}: no bars changed`
          : `Wrote ${args.section} bar${bars.length > 1 ? 's' : ''} ${bars.join(', ')}`,
      ...described,
    });
  }
}
