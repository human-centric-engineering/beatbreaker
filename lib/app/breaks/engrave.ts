import { FOOT_LANE, LANE_DEFS, activeLanes, laneName, percInst } from '@/lib/app/breaks/lanes';
import { countLabelsOf, groupsOf, isGroupStart, stepsOf } from '@/lib/app/breaks/meter';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import type { Bar, Group, LaneKey, Meter, Pattern } from '@/lib/app/breaks/types';

/**
 * The engraver: `(pattern, opts) => SVG`.
 *
 * It emits a plain node tree rather than touching `document`, which keeps it
 * pure — the same call works in a React render, in a test, and on the server
 * where a PDF export will eventually want it. The geometry is the prototype's,
 * unchanged; only the sink it draws into is different.
 *
 * Beaming, rest merging and accents all work in the meter's **pulse groups**,
 * which is how a compound bar beams in threes without anything here being told
 * about compound time.
 */

export interface SvgNode {
  tag: string;
  attrs: Record<string, string | number>;
  text?: string;
  children?: SvgNode[];
}

/** Where a step sits on the page, so the transport can put a playhead on it. */
export interface StepAnchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EngraveOptions {
  /** Everything scales off this; 1 is the reference size. */
  scale: number;
  /** Bars per system. */
  perSystem: number;
  /** Print the `1 e + a` counting row above each bar. */
  guides?: boolean;
  /** Print the sticking / limb row below the staff. */
  sticking?: boolean;
}

export interface Engraving {
  nodes: SvgNode[];
  /** Indexed by `barIndex * steps + step`. */
  map: StepAnchor[];
  width: number;
  height: number;
  steps: number;
  label: string;
}

/** Collects nodes in draw order. */
class Sink {
  readonly nodes: SvgNode[] = [];

  add(tag: string, attrs: Record<string, string | number>, text?: string): SvgNode {
    const node: SvgNode = text === undefined ? { tag, attrs } : { tag, attrs, text };
    this.nodes.push(node);
    return node;
  }
}

/** A `<g>` being filled — same interface as {@link Sink}, different destination. */
class GroupSink {
  readonly nodes: SvgNode[] = [];

  add(tag: string, attrs: Record<string, string | number>, text?: string): SvgNode {
    const node: SvgNode = text === undefined ? { tag, attrs } : { tag, attrs, text };
    this.nodes.push(node);
    return node;
  }
}

type AnySink = Sink | GroupSink;

/** One notehead to draw. */
interface Head {
  /** Staff position, in half-spaces from the bottom line. */
  step: number;
  type: 'oval' | 'x' | 'bell' | 'mark-o';
  ghost?: boolean;
  accent?: boolean;
  /** `'o'` circles the head — an open hi-hat. */
  mark?: string | null;
  ledger?: boolean;
}

export function engrave(pat: Pattern, ghostPat: Pattern | null, opts: EngraveOptions): Engraving {
  const { scale } = opts;
  const m = meterOfPat(pat);
  const nSteps = pat.bars[0] ? pat.bars[0].k.length : stepsOf(m);
  const groups = groupsOf(m);
  const labels = countLabelsOf(m);
  const lanes = activeLanes(pat.lanes);
  const tomLanes = lanes.filter((k) => LANE_DEFS[k].tom);
  const percLanes = lanes.filter((k) => LANE_DEFS[k].perc);

  const SP = 10 * scale; // one staff space
  const slotW = 21 * scale; // wide enough for a ghost note and its brackets
  const barW = slotW * nSteps;
  const leftPad = 56 * scale; // room for clef + time signature ON the staff
  const barGap = 12 * scale;
  const { perSystem } = opts;

  const guideH = opts.guides ? 18 * scale : 0;
  /* Auxiliary percussion is not kit notation and does not belong on the kit
     staff. It gets its own one-line staff per instrument, above the drums, the
     way an added percussion part is written on a chart. */
  const percRowH = 2.5 * SP;
  const percH = percLanes.length * percRowH;
  const upper = 6.6 * SP; // beams and accents live up here
  const hasFoot = lanes.includes(FOOT_LANE);
  const lower = (opts.sticking ? 5.9 * SP : 4.5 * SP) + (hasFoot ? 0.6 * SP : 0);
  const sysH = guideH + percH + upper + 4 * SP + lower;

  const systems = Math.ceil(pat.bars.length / perSystem);
  const widest = Math.min(perSystem, pat.bars.length);
  const width = leftPad + widest * barW + (widest - 1) * barGap + 16 * scale;
  const height = systems * sysH + 10 * scale;

  const out = new Sink();
  const map: StepAnchor[] = [];
  const ink = 'var(--ink)';

  for (let sys = 0; sys < systems; sys++) {
    const sysOrigin = sys * sysH;
    const percTop = sysOrigin + guideH;
    const staffTop = percTop + percH + upper;
    const staffBottom = staffTop + 4 * SP;
    const y = (step: number): number => staffBottom - step * (SP / 2);
    const percY = (idx: number): number => percTop + (idx + 0.62) * percRowH;

    const barsHere = Math.min(perSystem, pat.bars.length - sys * perSystem);
    const staffRight = leftPad + barsHere * barW + (barsHere - 1) * barGap;

    // staff lines — run the full width so the clef and time signature sit on them
    const staffLeft = 5 * scale;
    for (let l = 0; l < 5; l++) {
      out.add('line', {
        x1: staffLeft,
        x2: staffRight,
        y1: y(l * 2),
        y2: y(l * 2),
        stroke: ink,
        'stroke-width': Math.max(1.1, scale),
      });
    }

    // one line per percussion instrument, and its name at the left
    percLanes.forEach((key, idx) => {
      const yy = percY(idx);
      out.add('line', {
        x1: leftPad - 6 * scale,
        x2: staffRight,
        y1: yy,
        y2: yy,
        stroke: 'var(--faint)',
        'stroke-width': Math.max(1, 0.9 * scale),
        opacity: 0.7,
      });
      out.add(
        'text',
        {
          x: staffLeft,
          y: yy - 0.5 * SP,
          fill: 'var(--faint)',
          'font-size': `${8.6 * scale}px`,
          'font-family': 'var(--f-mono)',
        },
        laneName(key, pat.perc)
      );
    });

    // drum clef — two bars across the middle two spaces
    out.add('rect', {
      x: staffLeft + 8 * scale,
      y: y(6),
      width: 3.4 * scale,
      height: SP * 2,
      fill: ink,
    });
    out.add('rect', {
      x: staffLeft + 15 * scale,
      y: y(6),
      width: 3.4 * scale,
      height: SP * 2,
      fill: ink,
    });

    if (sys === 0) {
      // each numeral is two spaces tall: top spans steps 4–8, bottom steps 0–4
      const numerals: Array<[number, string]> = [
        [y(4), String(m.num)],
        [y(0), String(m.den)],
      ];
      for (const [yy, glyph] of numerals) {
        out.add(
          'text',
          {
            x: leftPad - 16 * scale,
            y: yy - 0.12 * SP,
            fill: ink,
            'text-anchor': 'middle',
            'font-size': `${SP * 2.35}px`,
            'font-weight': '700',
            'font-family': 'var(--f-body)',
          },
          glyph
        );
      }
    }

    for (let bi = 0; bi < barsHere; bi++) {
      const barIndex = sys * perSystem + bi;
      const bar = pat.bars[barIndex];
      const gbar = ghostPat ? ghostPat.bars[barIndex] : null;
      const x0 = leftPad + bi * (barW + barGap);
      const xs = (slot: number): number => x0 + slot * slotW + slotW * 0.5;

      // barlines
      out.add('line', {
        x1: x0,
        x2: x0,
        y1: y(0),
        y2: y(8),
        stroke: ink,
        'stroke-width': 1.2 * scale,
      });
      if (bi === barsHere - 1) {
        const xe = x0 + barW;
        out.add('line', {
          x1: xe - 3.5 * scale,
          x2: xe - 3.5 * scale,
          y1: y(0),
          y2: y(8),
          stroke: ink,
          'stroke-width': 1.2 * scale,
        });
        out.add('rect', {
          x: xe - 2 * scale,
          y: y(8),
          width: 3.4 * scale,
          height: 4 * SP,
          fill: ink,
        });
      }

      // bar number
      if (bi === 0) {
        out.add(
          'text',
          {
            x: 5 * scale,
            y: sysOrigin + (opts.guides ? 11 : 9) * scale,
            fill: 'var(--faint)',
            'font-size': `${9 * scale}px`,
            'font-family': 'var(--f-mono)',
          },
          `bar ${barIndex + 1}`
        );
      }

      // counting guide
      if (opts.guides) {
        for (let i = 0; i < nSteps; i++) {
          const strong = isGroupStart(m, i);
          out.add(
            'text',
            {
              x: xs(i),
              y: sysOrigin + 12 * scale,
              fill: strong ? ink : 'var(--faint)',
              'text-anchor': 'middle',
              'font-size': `${9.5 * scale}px`,
              'font-family': 'var(--f-mono)',
              'font-weight': strong ? '600' : '400',
            },
            labels[i] ?? ''
          );
        }
      }

      // playhead anchors
      for (let i = 0; i < nSteps; i++) {
        map[barIndex * nSteps + i] = {
          x: x0 + i * slotW,
          y: sysOrigin + guideH,
          w: slotW,
          h: sysH - guideH,
        };
      }

      // PERCUSSION BAND — stemless, an ostinato line rather than kit notation
      percLanes.forEach((key, idx) => {
        const inst = percInst(pat.perc?.[key as 'p1' | 'p2']);
        const yy = percY(idx);
        for (let i = 0; i < nSteps; i++) {
          const v = bar[key][i];
          if (!v) continue;
          drawPercHead(out, xs(i), yy, SP, scale, inst.head, v === 2, ink);
        }
      });

      const voice = {
        out,
        bar,
        gbar,
        xs,
        y,
        SP,
        scale,
        ink,
        staffTop,
        staffBottom,
        opts,
        meter: m,
        nSteps,
        groups,
        toms: tomLanes,
      };
      // UPPER VOICE (hat / ride / crash)
      drawVoice({ ...voice, up: true, beamY: y(8) - 3.3 * SP });
      // LOWER VOICE (kick / snare / toms)
      drawVoice({ ...voice, up: false, beamY: y(0) + 2.3 * SP });

      // sticking / limb row
      if (opts.sticking) {
        for (let i = 0; i < nSteps; i++) {
          let lab = '';
          if (bar.h[i] || bar.r[i] || bar.c[i]) lab = 'R';
          if (bar.s[i] || tomLanes.some((L) => !!bar[L][i])) lab = lab ? 'R L' : 'L';
          if (bar.k[i]) lab = lab ? `${lab.replace('R L', 'RL')} ●` : '●';
          if (bar[FOOT_LANE][i]) lab = lab ? `${lab}◦` : '◦';
          if (!lab) continue;
          out.add(
            'text',
            {
              x: xs(i),
              y: y(0) + 5.1 * SP,
              fill: 'var(--faint)',
              'text-anchor': 'middle',
              'font-size': `${7.6 * scale}px`,
              'font-family': 'var(--f-mono)',
            },
            lab
          );
        }
      }
    }
  }

  return {
    nodes: out.nodes,
    map,
    width,
    height,
    steps: nSteps,
    label: `Drum notation in ${m.label}, ${pat.bars.length} bars`,
  };
}

/** One notehead on the percussion line: cross, triangle or small oval. */
function drawPercHead(
  out: AnySink,
  x: number,
  yy: number,
  SP: number,
  scale: number,
  kind: 'x' | 'tri' | 'oval',
  accent: boolean,
  color: string
): void {
  const r = 0.44 * SP;
  if (kind === 'tri') {
    out.add('path', {
      d: `M ${x} ${yy - r * 1.15} L ${x + r} ${yy + r * 0.8} L ${x - r} ${yy + r * 0.8} Z`,
      fill: accent ? color : 'none',
      stroke: color,
      'stroke-width': 1.2 * scale,
      'stroke-linejoin': 'round',
    });
  } else if (kind === 'oval') {
    out.add('ellipse', {
      cx: x,
      cy: yy,
      rx: r * 1.15,
      ry: r * 0.85,
      fill: accent ? color : 'none',
      stroke: color,
      'stroke-width': 1.2 * scale,
      transform: `rotate(-17 ${x} ${yy})`,
    });
  } else {
    const w = accent ? 1.5 * scale : 1.2 * scale;
    out.add('line', {
      x1: x - r,
      y1: yy - r,
      x2: x + r,
      y2: yy + r,
      stroke: color,
      'stroke-width': w,
    });
    out.add('line', {
      x1: x - r,
      y1: yy + r,
      x2: x + r,
      y2: yy - r,
      stroke: color,
      'stroke-width': w,
    });
  }
  if (accent) drawAccent(out, x, yy - 1.25 * SP, SP * 0.8, scale, color);
}

interface VoiceCtx {
  out: Sink;
  bar: Bar;
  gbar: Bar | null;
  up: boolean;
  xs: (slot: number) => number;
  y: (step: number) => number;
  SP: number;
  scale: number;
  ink: string;
  beamY: number;
  staffTop: number;
  staffBottom: number;
  opts: EngraveOptions;
  meter: Meter;
  nSteps: number;
  groups: Group[];
  toms: LaneKey[];
}

/** Draws one voice of one bar: durations, beams, rests, noteheads. */
function drawVoice(ctx: VoiceCtx): void {
  const { out, bar, gbar, up, xs, y, SP, scale, ink, beamY, nSteps, groups, toms } = ctx;

  const heads: Head[][] = [];
  for (let i = 0; i < nSteps; i++) {
    const list: Head[] = [];
    if (up) {
      if (bar.h[i])
        list.push({
          step: 9,
          type: 'x',
          accent: bar.h[i] === 2,
          mark: bar.h[i] === 3 ? 'o' : null,
        });
      if (bar.r[i])
        list.push({ step: 8, type: bar.r[i] === 2 ? 'bell' : 'x', accent: bar.r[i] === 2 });
      if (bar.c[i]) list.push({ step: 11, type: 'x', accent: true, ledger: true });
    } else {
      if (bar.s[i]) {
        list.push(
          bar.s[i] === 4
            ? { step: 5, type: 'x' } // cross-stick: an X on the snare line
            : { step: 5, type: 'oval', ghost: bar.s[i] === 1, accent: bar.s[i] === 3 }
        );
      }
      for (const L of toms) {
        if (bar[L][i])
          list.push({ step: LANE_DEFS[L].staff ?? 0, type: 'oval', accent: bar[L][i] === 2 });
      }
      if (bar.k[i]) list.push({ step: 1, type: 'oval', accent: bar.k[i] === 2 });
      // the hi-hat foot is written below the staff, in the voice with the other foot
      if (bar[FOOT_LANE][i]) list.push({ step: -1, type: 'x' });
    }
    heads[i] = list;
  }

  // faded "next layer" notes
  if (gbar) {
    for (let i = 0; i < nSteps; i++) {
      const extra: Head[] = [];
      if (up) {
        if (gbar.h[i] && !bar.h[i]) extra.push({ step: 9, type: 'x' });
        if (gbar.r[i] && !bar.r[i]) extra.push({ step: 8, type: 'x' });
        if (gbar.h[i] === 3 && bar.h[i] === 1) extra.push({ step: 9, type: 'mark-o' });
      } else {
        if (gbar.s[i] && !bar.s[i]) {
          extra.push(
            gbar.s[i] === 4
              ? { step: 5, type: 'x' }
              : { step: 5, type: 'oval', ghost: gbar.s[i] === 1 }
          );
        }
        for (const L of toms) {
          if (gbar[L][i] && !bar[L][i]) extra.push({ step: LANE_DEFS[L].staff ?? 0, type: 'oval' });
        }
        if (gbar.k[i] && !bar.k[i]) extra.push({ step: 1, type: 'oval' });
        if (gbar[FOOT_LANE][i] && !bar[FOOT_LANE][i]) extra.push({ step: -1, type: 'x' });
      }
      for (const h of extra) {
        if (h.type === 'mark-o') {
          out.add('circle', {
            cx: xs(i),
            cy: y(9),
            r: OPEN_RING_R * SP,
            fill: 'none',
            stroke: 'var(--faint)',
            'stroke-width': OPEN_RING_W * scale,
            opacity: 0.45,
          });
          continue;
        }
        drawHead(out, xs(i), y(h.step), SP, scale, h, 'var(--faint)', 0.38);
      }
    }
  }

  // per pulse: durations, beams, rests
  for (const grp of groups) {
    const gStart = grp.start;
    const gSize = Math.min(grp.size, nSteps - grp.start);
    const gEnd = gStart + gSize;

    const slots: number[] = [];
    for (let i = gStart; i < gEnd; i++) if (heads[i].length) slots.push(i);

    // rests before the first note of the pulse
    if (!slots.length) {
      drawRest(out, xs(gStart + (gSize - 1) / 2), up ? y(6) : y(2), SP, scale, gSize, ink);
      continue;
    }
    if (slots[0] > gStart) {
      drawRestRun(
        out,
        xs,
        gStart,
        slots[0] - gStart,
        up ? y(6) : y(2),
        SP,
        scale,
        ink,
        gStart,
        gSize
      );
    }

    const durs = slots.map((s, idx) => (idx + 1 < slots.length ? slots[idx + 1] : gEnd) - s);

    // stems
    for (const s of slots) {
      const steps = heads[s].map((h) => h.step);
      const topStep = Math.max(...steps);
      const botStep = Math.min(...steps);
      const x = xs(s);
      const stemX = up ? x + 0.62 * SP : x - 0.62 * SP;
      const from = up ? y(botStep) : y(topStep);
      out.add('line', {
        x1: stemX,
        x2: stemX,
        y1: from,
        y2: beamY,
        stroke: ink,
        'stroke-width': 1.25 * scale,
        'stroke-linecap': 'butt',
      });
    }

    // beams
    const beamed = slots.filter((_s, idx) => durs[idx] < 4);
    if (beamed.length) {
      const first = xs(beamed[0]) + (up ? 0.62 * SP : -0.62 * SP);
      const last = xs(beamed[beamed.length - 1]) + (up ? 0.62 * SP : -0.62 * SP);
      const bh = 0.44 * SP;
      const primaryY = up ? beamY : beamY - bh;

      if (beamed.length > 1) {
        out.add('rect', {
          x: Math.min(first, last) - 0.62 * scale,
          y: primaryY,
          width: Math.abs(last - first) + 1.24 * scale,
          height: bh,
          fill: ink,
        });
      } else {
        // single 8th/16th: flag-ish stub
        out.add('rect', { x: first, y: primaryY, width: 2.6 * SP * 0.45, height: bh, fill: ink });
      }

      // secondary beam for 16ths
      const secY = up ? beamY + bh * 1.6 : beamY - bh * 2.6;
      slots.forEach((s, idx) => {
        if (durs[idx] !== 1) return;
        const sx = xs(s) + (up ? 0.62 * SP : -0.62 * SP);
        const nextIdx = idx + 1;
        if (nextIdx < slots.length && slots[nextIdx] === s + 1 && durs[nextIdx] === 1) {
          const nx = xs(slots[nextIdx]) + (up ? 0.62 * SP : -0.62 * SP);
          out.add('rect', {
            x: Math.min(sx, nx) - 0.62 * scale,
            y: secY,
            width: Math.abs(nx - sx) + 1.24 * scale,
            height: bh,
            fill: ink,
          });
        } else if (!(idx > 0 && slots[idx - 1] === s - 1 && durs[idx - 1] === 1)) {
          const stub = 0.9 * SP;
          const sx2 = idx > 0 ? sx - stub : sx;
          out.add('rect', { x: sx2, y: secY, width: stub, height: bh, fill: ink });
        } else {
          const stub = 0.9 * SP;
          out.add('rect', { x: sx - stub, y: secY, width: stub, height: bh, fill: ink });
        }
      });
    }

    // noteheads, marks, accents
    for (const s of slots) {
      const x = xs(s);
      for (const h of heads[s]) {
        if (h.ledger) {
          out.add('line', {
            x1: x - 1.15 * SP,
            x2: x + 1.15 * SP,
            y1: y(10),
            y2: y(10),
            stroke: ink,
            'stroke-width': Math.max(1.1, scale),
          });
        }
        drawHead(out, x, y(h.step), SP, scale, h, ink, 1);
        if (h.mark === 'o') {
          out.add('circle', {
            cx: x,
            cy: y(h.step),
            r: OPEN_RING_R * SP,
            fill: 'none',
            stroke: ink,
            'stroke-width': OPEN_RING_W * scale,
          });
        }
        if (h.accent) {
          const ay = up ? beamY - 1.05 * SP : y(0) + 3.4 * SP;
          drawAccent(out, x, ay, SP, scale, ink);
        }
      }
    }
  }
}

/* An open hi-hat is a circled X — the ring goes round the notehead, not above
   it. A detached `o` floating over the beams is the other convention, but on a
   16th-note chart it lands in the one strip already full of ink, and it makes
   the reader look in two places to read one note. Circling the head keeps the
   marking where the note is.

   The radius is bounded from above, not chosen for looks: an up-stem is drawn
   at `x + 0.62 SP`, so any ring wider than that has the note's own stem drawn
   through it. Staying inside the stem also keeps the ring within the X's own
   vertical footprint (±0.56 SP), which is what stops it reaching the ride a
   half-space below or the crash's ledger line above. The X's diagonal tips
   cross the ring, which is what `⊗` looks like anyway. */
const OPEN_RING_R = 0.58;
const OPEN_RING_W = 1.15;

function drawHead(
  out: AnySink,
  x: number,
  yy: number,
  SP: number,
  scale: number,
  h: Head,
  color: string,
  opacity: number
): void {
  if (h.type === 'oval') {
    const rx = (h.ghost ? 0.56 : 0.68) * SP;
    const ry = (h.ghost ? 0.42 : 0.5) * SP;
    out.add('ellipse', {
      cx: x,
      cy: yy,
      rx,
      ry,
      fill: color,
      opacity,
      transform: `rotate(-17 ${x} ${yy})`,
    });
    if (h.ghost) {
      // the brackets a ghost note is written in
      ['(', ')'].forEach((ch, i) => {
        out.add(
          'text',
          {
            x: x + (i ? 0.96 : -0.96) * SP,
            y: yy + 0.46 * SP,
            fill: color,
            opacity,
            'text-anchor': 'middle',
            'font-size': `${1.55 * SP}px`,
            'font-family': 'var(--f-body)',
          },
          ch
        );
      });
    }
  } else if (h.type === 'bell') {
    /* A diamond, not a circled X: the circled X is the open hi-hat, one staff
       position above, and two rings half a space apart cannot be told apart at
       chart size. The diamond is the other standard bell notehead.

       It is drawn to the same footprint as the X it replaces (±0.56 SP tall)
       and wider than it is tall, the way a diamond notehead is cut. A taller
       diamond would be a solid fill spilling onto the hi-hat position a half
       space above — where the X's two thin strokes had been transparent. */
    const rx = 0.62 * SP;
    const ry = 0.56 * SP;
    out.add('polygon', {
      points: [`${x},${yy - ry}`, `${x + rx},${yy}`, `${x},${yy + ry}`, `${x - rx},${yy}`].join(
        ' '
      ),
      fill: color,
      opacity,
    });
  } else if (h.type === 'x') {
    const r = 0.56 * SP;
    const w = 1.5 * scale;
    out.add('line', {
      x1: x - r,
      y1: yy - r,
      x2: x + r,
      y2: yy + r,
      stroke: color,
      opacity,
      'stroke-width': w,
    });
    out.add('line', {
      x1: x - r,
      y1: yy + r,
      x2: x + r,
      y2: yy - r,
      stroke: color,
      opacity,
      'stroke-width': w,
    });
  }
}

function drawAccent(
  out: AnySink,
  x: number,
  yy: number,
  SP: number,
  scale: number,
  color: string
): void {
  const w = 0.7 * SP;
  const h = 0.46 * SP;
  out.add('path', {
    d: `M ${x - w} ${yy - h} L ${x + w} ${yy} L ${x - w} ${yy + h}`,
    fill: 'none',
    stroke: color,
    'stroke-width': 1.25 * scale,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
}

/** Merge a run of empty slots into the fewest rests that fit. */
function drawRestRun(
  out: Sink,
  xs: (slot: number) => number,
  start: number,
  len: number,
  yy: number,
  SP: number,
  scale: number,
  color: string,
  gStart: number,
  gSize: number
): void {
  let i = start;
  let remaining = len;
  while (remaining > 0) {
    let take: number;
    if (remaining >= gSize && i === gStart) take = gSize;
    else if (remaining >= 2 && (i - gStart) % 2 === 0) take = 2;
    else take = 1;
    drawRest(out, xs(i) + ((take - 1) * (xs(1) - xs(0))) / 2, yy, SP, scale, take, color);
    i += take;
    remaining -= take;
  }
}

function drawRest(
  out: Sink,
  x: number,
  yy: number,
  SP: number,
  scale: number,
  dur: number,
  color: string
): void {
  const g = new GroupSink();

  // a pulse of six sixteenths is a dotted quarter of silence, not a quarter
  if (dur === 6)
    g.add('circle', { cx: 1.25 * SP, cy: 0, r: 0.19 * SP, fill: color, stroke: 'none' });

  if (dur >= 4) {
    // quarter rest — stylised zigzag
    g.add('path', {
      d: 'M -0.25,-1.35 L 0.42,-0.45 L -0.2,0.15 L 0.5,1.1 L -0.05,0.75 C -0.6,0.55 -0.45,1.25 0.1,1.5',
      transform: `scale(${SP * 0.78})`,
      fill: 'none',
      stroke: color,
      'stroke-width': 0.3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
  } else {
    // 8th / 16th rest — slanted stem with one or two hooks
    const s = SP * 0.62;
    g.add('line', {
      x1: 0.55 * s,
      y1: -1.25 * s,
      x2: -0.35 * s,
      y2: 1.35 * s,
      stroke: color,
      'stroke-width': 0.9 * scale,
      'stroke-linecap': 'round',
    });
    const hook = (oy: number): void => {
      g.add('path', {
        d: `M ${0.55 * s} ${oy} c ${-0.7 * s} ${0.15 * s} ${-0.9 * s} ${-0.55 * s} ${-0.2 * s} ${-0.62 * s}`,
        fill: color,
        stroke: 'none',
      });
      g.add('circle', { cx: 0.02 * s, cy: oy - 0.42 * s, r: 0.3 * s, fill: color, stroke: 'none' });
    };
    hook(-1.1 * s);
    if (dur === 1) hook(-0.05 * s);
  }

  out.nodes.push({
    tag: 'g',
    attrs: { transform: `translate(${x},${yy})`, fill: color, stroke: color },
    children: g.nodes,
  });
}
