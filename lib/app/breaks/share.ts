import { BASE_LANES, LANES, percRoster } from '@/lib/app/breaks/lanes';
import { DEFAULT_METER, METERS, meterOf, stepsOf } from '@/lib/app/breaks/meter';
import { LAYER_V1_TO_V2 } from '@/lib/app/breaks/layers';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { type PackedPattern, sharePayloadSchema } from '@/lib/app/breaks/schema';
import { STYLES } from '@/lib/app/breaks/styles';
import type { LaneKey, Pattern, PercLaneKey, Pins } from '@/lib/app/breaks/types';

/**
 * Share codes: a whole break — both sections, the tempo, the swing and the
 * style — as one base64 string you can paste to anyone.
 *
 * **Version 3** adds the meter, the lane roster and what is in each percussion
 * slot. A version 2 code still decodes: no meter means 4/4, no roster means the
 * five lanes everyone had, and the rows it does not carry come back empty.
 *
 * Decoding runs through Zod rather than trusting the parsed JSON. A code is a
 * blob a stranger pasted in; the type system has nothing to say about it until
 * something has actually checked.
 */

export const SHARE_VERSION = 3;

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

function pack(p: Pattern): PackedPattern {
  return {
    n: p.name,
    st: p.style,
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
    A: pack(doc.A),
    B: pack(doc.B),
  };
  return toBase64(JSON.stringify(payload));
}

function unpack(p: PackedPattern): Pattern {
  const mk = p.mt && METERS[p.mt] ? p.mt : DEFAULT_METER;
  const n = stepsOf(meterOf(mk));
  const style = STYLES[p.st] ? p.st : 'funk';

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
    style,
    meter: mk,
    seed: p.sd >>> 0,
    voice: p.v,
    lanes: lanes.length ? lanes : BASE_LANES.slice(),
    perc: { ...percRoster(STYLES[style]), ...(p.pc as Partial<Record<PercLaneKey, string>>) },
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
export function decodeBreak(code: string): BreakDoc {
  const raw: unknown = JSON.parse(fromBase64(code));
  const payload = sharePayloadSchema.parse(raw);

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
    A: unpack(payload.A),
    B: unpack(payload.B),
  };
}
