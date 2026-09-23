import { BASE_LANES, LANES, percRoster } from '@/lib/app/breaks/lanes';
import { DEFAULT_METER, METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { LAYER_V1_TO_V2 } from '@/lib/app/breaks/layers';
import { emptyBar, styleAttrs } from '@/lib/app/breaks/pattern';
import { type PackedPattern, type SharePayload, sharePayloadSchema } from '@/lib/app/breaks/schema';
import type { LaneKey, Pattern, PercLaneKey, Pins, ResolvedStyle } from '@/lib/app/breaks/types';

/**
 * Share codes: a whole break — both sections, the tempo, the swing and the
 * style — as one base64 string you can paste to anyone.
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

export const SHARE_VERSION = 4;

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

/** Everything a share code carries. */
export interface BreakDoc {
  bpm: number;
  swing: number;
  level: number;
  arrangement: Array<'A' | 'B'>;
  A: Pattern;
  B: Pattern;
}

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
    b: p.bars.map((bar) => LANES.map((L) => bar[L].join('')).join('|')),
  };
}

export function encodeBreak(doc: BreakDoc): string {
  const payload = {
    ver: SHARE_VERSION,
    bpm: doc.bpm,
    sw: doc.swing,
    lv: doc.level,
    arr: doc.arrangement,
    A: packPattern(doc.A),
    B: packPattern(doc.B),
  };
  return toBase64(JSON.stringify(payload));
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

  return {
    name: p.n,
    style: p.st,
    styleVersionId,
    attrs,
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

  return {
    bpm: payload.bpm,
    swing: payload.sw,
    level,
    arrangement: payload.arr?.length ? payload.arr : ['A', 'A', 'B', 'A'],
    A: patternFromPacked(payload.A, styles),
    B: patternFromPacked(payload.B, styles),
  };
}
