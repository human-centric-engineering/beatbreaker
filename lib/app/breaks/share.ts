import { BASE_LANES, LANES, percRoster } from '@/lib/app/breaks/lanes';
import { DEFAULT_METER, METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { LAYER_V1_TO_V2 } from '@/lib/app/breaks/layers';
import {
  clonePoly,
  emptyBar,
  stickingRow,
  styleAttrs,
  tidySticking,
} from '@/lib/app/breaks/pattern';
import { type PackedPattern, type SharePayload, sharePayloadSchema } from '@/lib/app/breaks/schema';
import {
  EXTRA_LETTERS,
  type SectionLetter,
  type Sections,
  hasExtraSections,
  hasModulations,
  hasTempoRatios,
  patternsOf,
} from '@/lib/app/breaks/sections';
import { spanFits } from '@/lib/app/breaks/poly-fill';
import { clearUnderTuplets, keepTuplets, tupletLanes, tupletsOf } from '@/lib/app/breaks/tuplets';
import type {
  LaneKey,
  Pattern,
  PercLaneKey,
  Pins,
  PolySpan,
  ResolvedStyle,
} from '@/lib/app/breaks/types';

/**
 * Share codes: a whole break — every section, the tempo, the swing and the
 * style — as one base64 string you can paste to anyone.
 *
 * **Version 8** (12-d) adds tuplet spans (`tu`) and the metric modulations'
 * tempo ratios (×2/3, ×3/4, ×4/3, ×3/2). Written only where a section has one:
 * a v7 reader would drop `tu` and play rests where the figure is, or refuse a
 * ratio it does not know, so it must refuse the code. Every break without
 * them keeps its version, its bytes and its `gridHash`.
 *
 * **Version 7** (11-e-ii-g) adds a section's tempo ratio (`tr`, ×½ or ×2). It
 * is written only when a section has one: a v6 reader would drop the key it
 * does not know and play that section at the break's tempo, so it must refuse
 * the code instead, as it refuses any newer version.
 *
 * **Version 6** (11-e-ii) adds sections C to Z beside A and B. It is written
 * only when a break has one, or an arrangement names one: a break of A and B
 * is still a v5 code, byte for byte, so its link and its `gridHash` are what
 * they were, and a reader that knows only v5 still opens it.
 *
 * **Version 5** (9-iv) adds the articulations — rimshot, flam, drag and buzz
 * on the snare, the half-open hat, crash 2, china and splash, the tom flam —
 * as step values 5–8 on the lanes that have them. Nothing else moved, so a v4
 * code decodes to exactly the bars it always did, and re-encodes to the same
 * bars under version 5. A code is held to its own version's values (see
 * `sharePayloadSchema`).
 *
 * **Version 4** makes a pattern stand on its own. It adds the style version the
 * pattern came from (`sv`) and a snapshot of the five style attributes playback,
 * the critic and the MIDI export read (`sa`). Before it, all three of those
 * looked the style up in a table compiled into the app — which was fine while
 * styles were code and is wrong now they are rows somebody can edit, delete, or
 * keep private. A v4 code plays, scores and exports the same on any
 * installation, including one that has never heard of its style.
 *
 * **Version 3** added the meter, the lane roster and what is in each percussion
 * slot. A version 2 code still decodes: no meter means 4/4, no roster means the
 * five lanes everyone had, and the rows it does not carry come back empty.
 *
 * Decoding runs through Zod rather than trusting the parsed JSON. A code is a
 * blob a stranger pasted in; the type system has nothing to say about it until
 * something has actually checked.
 */

/** The newest version this app writes — for a break with a tuplet or a metric modulation. */
export const SHARE_VERSION = 8;

/** The version a break with a section at ×½ or ×2, and nothing newer, is written as. */
export const SHARE_VERSION_RATIOS = 7;

/** The version a break with sections past B, and no tempo ratio, is written as. */
export const SHARE_VERSION_SECTIONS = 6;

/** The version a break of A and B alone is written as, so its code does not change. */
export const SHARE_VERSION_AB = 5;

/**
 * How a code older than v4 gets its snapshot back.
 *
 * A v3 code names a style and nothing else, so decoding one means looking that
 * style up. The lookup is the caller's, passed in rather than imported, because
 * `lib/app/breaks` owns no tables — the server resolves against the database,
 * the Studio against the catalogue it was handed.
 *
 * Synchronous on purpose: `decodeBreak` runs on a paste, in the browser, and an
 * `await` here would make every caller async for the sake of a case that only
 * arises for old codes.
 */
export type StyleLookup = (key: string) => ResolvedStyle | undefined;

/** Everything a share code carries: the playback, and every section A to Z. */
export type BreakDoc = {
  bpm: number;
  swing: number;
  level: number;
  arrangement: SectionLetter[];
} & Sections;

/* base64 of the UTF-8 bytes — the same bytes as the prototype's
   `btoa(unescape(encodeURIComponent(s)))`, without the deprecated `unescape`. */
function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(code: string): string {
  const bin = atob(code.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * One pattern, as it travels: short keys, rows as strings.
 *
 * Exported because a share code is no longer the only thing that carries one —
 * a library entry's `doc` column is a packed pattern too, written by the seed.
 * One packer, so an entry and a code cannot drift apart.
 */
export function packPattern(p: Pattern): PackedPattern {
  return {
    n: p.name,
    st: p.style,
    sv: p.styleVersionId ?? undefined,
    sa: p.attrs ?? {},
    ...(p.song ? { sg: p.song } : {}),
    ...(p.tempoRatio ? { tr: p.tempoRatio } : {}),
    v: p.voice,
    sd: p.seed,
    bb: p.backbeats,
    mt: p.meter || DEFAULT_METER,
    ln: (p.lanes ?? BASE_LANES).slice(),
    pc: { ...p.perc },
    bl: p.bbLane || 's',
    hr: p.hasRide ? 1 : 0,
    hh: p.hasHat ? 1 : 0,
    pn: p.pins
      ? p.pins.map((b) => {
          if (!b) return 0 as const;
          const o: Record<string, string> = {};
          for (const k of Object.keys(b) as LaneKey[]) {
            const row = b[k];
            if (!row) continue;
            const j = row.join('');
            // a row of all zeroes is not worth the bytes
            if (/[1-9]/.test(j)) o[k] = j;
          }
          return Object.keys(o).length ? o : (0 as const);
        })
      : (0 as const),
    ...(p.sticking?.some(Boolean)
      ? { sk: p.sticking.map((row) => (row && /[RLrl]/.test(row) ? row : (0 as const))) }
      : {}),
    ...(p.fixed ? { fx: 1 as const } : {}),
    ...(p.poly ? { py: clonePoly(p.poly) } : {}),
    ...(tupletsOf(p).length
      ? {
          tu: tupletsOf(p).map((t) => ({
            b: t.bar,
            a: t.start,
            s: t.span,
            n: t.n,
            x: Object.fromEntries(tupletLanes(t).map((L) => [L, t.notes[L]?.join('')])),
          })),
        }
      : {}),
    ...(p.polySpans?.length
      ? {
          ps: p.polySpans.map((s) => ({
            b: s.bar,
            a: s.at,
            n: s.span,
            d: s.device,
            ...(s.ratio ? { r: s.ratio } : {}),
            e: s.every,
            p: Object.fromEntries(Object.entries(s.plain).map(([L, row]) => [L, row?.join('')])),
            ...(s.hands ? { h: { ...s.hands } } : {}),
          })),
        }
      : {}),
    b: p.bars.map((bar) => LANES.map((L) => bar[L].join('')).join('|')),
  };
}

/**
 * A break as its wire payload — the JSON a share code is the base64 of, and
 * the `doc` a `POST`/`PATCH` of `/api/v1/breaks` carries.
 */
export function breakPayload(doc: BreakDoc): SharePayload {
  const extra = hasExtraSections(doc) || doc.arrangement.some((L) => L !== 'A' && L !== 'B');
  const v8 = hasModulations(doc) || patternsOf(doc).some((p) => tupletsOf(p).length > 0);
  const out: SharePayload = {
    ver: v8
      ? SHARE_VERSION
      : hasTempoRatios(doc)
        ? SHARE_VERSION_RATIOS
        : extra
          ? SHARE_VERSION_SECTIONS
          : SHARE_VERSION_AB,
    bpm: doc.bpm,
    sw: doc.swing,
    lv: doc.level,
    arr: doc.arrangement,
    A: packPattern(doc.A),
    B: packPattern(doc.B),
  };
  for (const L of EXTRA_LETTERS) {
    const p = doc[L];
    if (p) out[L] = packPattern(p);
  }
  return out;
}

export function encodeBreak(doc: BreakDoc): string {
  return toBase64(JSON.stringify(breakPayload(doc)));
}

/**
 * A break cut back to A and B, as a whole new pattern is: the sections past B
 * go, and so does every slot of the arrangement that played one. An
 * arrangement left with nothing plays A.
 */
export function withoutExtraSections(doc: BreakDoc): BreakDoc {
  const kept = doc.arrangement.filter((L) => L === 'A' || L === 'B');
  const out: BreakDoc = { ...doc, arrangement: kept.length ? kept : ['A'] };
  for (const L of EXTRA_LETTERS) delete out[L];
  return out;
}

/**
 * A packed pattern, back as a {@link Pattern}.
 *
 * Exported alongside {@link packPattern} for the same reason: a library entry
 * is a packed pattern, and opening one must go through exactly the path a
 * pasted code goes through.
 */
export function patternFromPacked(p: PackedPattern, styles?: StyleLookup): Pattern {
  const mk = p.mt && METERS[p.mt] ? p.mt : DEFAULT_METER;
  const n = stepsOf(meterOf(mk));

  /* The style key is kept as written. v3 and earlier substituted `'funk'` for a
     style they did not recognise, which quietly relabelled somebody else's
     pattern as one of ours — and now that styles are rows, "not recognised"
     usually means "not on this installation", which is not a reason to rewrite
     what the author said. An unknown key is a key the picker cannot select and
     nothing else: the pattern still plays, because the snapshot travels with
     it. */
  const known = styles?.(p.st);

  /* v4 carries its own snapshot. Older codes did not, so the style is looked up
     — and where the lookup comes back empty, because the caller passed none or
     the style is gone, the pattern loads with default feel rather than refusing
     to load. A v3 break that sounds a shade straighter is a better answer than
     an unopenable one. */
  const attrs = p.sa ?? styleAttrs(known?.params);
  const styleVersionId = p.sv ?? known?.versionId ?? null;

  const lanes = (p.ln?.length ? p.ln : BASE_LANES).filter((l): l is LaneKey =>
    (LANES as string[]).includes(l)
  );

  const pins: Pins | null =
    p.pn && p.pn.length
      ? p.pn.map((b) => {
          if (!b) return {};
          const o: Partial<Record<LaneKey, number[]>> = {};
          for (const k of Object.keys(b) as LaneKey[]) {
            if (!(LANES as string[]).includes(k)) continue;
            o[k] = b[k].split('').map(Number);
          }
          return o;
        })
      : null;

  // one row a bar, held to the bar's length; a row past the last bar is dropped
  const sticking = tidySticking(
    p.sk?.slice(0, p.b.length).map((row) => stickingRow(row === 0 ? null : row, n))
  );

  const pat: Pattern = {
    name: p.n,
    style: p.st,
    styleVersionId,
    attrs,
    ...(p.sg ? { song: p.sg } : {}),
    ...(p.tr ? { tempoRatio: p.tr } : {}),
    meter: mk,
    seed: p.sd >>> 0,
    voice: p.v,
    lanes: lanes.length ? lanes : BASE_LANES.slice(),
    perc: { ...percRoster(known?.params), ...(p.pc as Partial<Record<PercLaneKey, string>>) },
    backbeats: p.bb,
    bbLane: ((LANES as string[]).includes(p.bl ?? '') ? p.bl : 's') as LaneKey,
    hasRide: !!p.hr,
    hasHat: !!p.hh,
    pins,
    ...(sticking ? { sticking } : {}),
    ...(p.fx ? { fixed: true } : {}),
    ...(p.py ? { poly: clonePoly(p.py) } : {}),
    ...polySpansOf(p.ps, n, p.b.length),
    ...(p.tu?.length
      ? {
          tuplets: p.tu.map((t) => ({
            bar: t.b,
            start: t.a,
            span: t.s,
            n: t.n,
            notes: Object.fromEntries(
              Object.entries(t.x).map(([L, row]) => [L, [...(row ?? '')].map(Number)])
            ),
          })),
        }
      : {}),
    bars: p.b.map((row) => {
      const parts = row.split('|');
      const bar = emptyBar(n);
      LANES.forEach((L, i) => {
        const src = parts[i] ?? '';
        for (let j = 0; j < n; j++) bar[L][j] = Number(src[j] ?? 0);
      });
      return bar;
    }),
  };
  /* A span that does not fit its bars is left out, not trusted; one that does
     owns its cells, so a note a hand-written code put under it is not played
     twice. */
  keepTuplets(pat);
  clearUnderTuplets(pat);
  return pat;
}

/**
 * A packed pattern's poly-fill spans (12-c), each held to the bars it came
 * with: one that does not fit them, or whose plain rows are not its length,
 * is left out rather than trusted.
 */
function polySpansOf(ps: PackedPattern['ps'], n: number, bars: number): { polySpans?: PolySpan[] } {
  const spans = (ps ?? [])
    .map((s): PolySpan => ({
      bar: s.b,
      at: s.a,
      span: s.n,
      device: s.d,
      ...(s.r ? { ratio: s.r } : {}),
      every: s.e,
      plain: Object.fromEntries(
        Object.entries(s.p).map(([L, row]) => [L, [...(row ?? '')].map(Number)])
      ),
      ...(s.h ? { hands: { ...s.h } } : {}),
    }))
    .filter(
      (s) => spanFits(s, n, bars) && Object.values(s.plain).every((row) => row?.length === s.span)
    );
  return spans.length ? { polySpans: spans } : {};
}

/**
 * Decode a pasted code.
 *
 * @throws if the code is not base64, not JSON, or not a shape this version
 * understands — all three are the same thing to the person who pasted it, so
 * the caller should say "that is not a BeatBreaker code" rather than relay the
 * reason.
 */
export function decodeBreak(code: string, styles?: StyleLookup): BreakDoc {
  const raw: unknown = JSON.parse(fromBase64(code));
  return breakDocFromPayload(sharePayloadSchema.parse(raw), styles);
}

/**
 * A validated wire payload as a usable break.
 *
 * Split out from {@link decodeBreak} because the API route receives the same
 * payload as a JSON body rather than as base64 — one shape, one conversion, so
 * a break that arrived over HTTP and one that arrived through the paste box
 * cannot drift apart.
 */
export function breakDocFromPayload(payload: SharePayload, styles?: StyleLookup): BreakDoc {
  /* Layer numbers moved when the L2->L3 step was split in two: what was 3
     (16ths + ghosts) is now 4, and the full break moved from 4 to 5. */
  const level =
    payload.lv == null
      ? 5
      : payload.ver >= 2
        ? payload.lv
        : (LAYER_V1_TO_V2[payload.lv] ?? payload.lv);

  const doc: BreakDoc = {
    bpm: payload.bpm,
    swing: payload.sw,
    level,
    arrangement: payload.arr?.length ? payload.arr : ['A', 'A', 'B', 'A'],
    A: patternFromPacked(payload.A, styles),
    B: patternFromPacked(payload.B, styles),
  };
  for (const L of EXTRA_LETTERS) {
    const p = payload[L];
    if (p) doc[L] = patternFromPacked(p, styles);
  }
  return doc;
}
