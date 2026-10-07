/**
 * A DrumGizmo kit's strokes: one WAV per stroke with every mic in it, one
 * channel each. Which channel is which mic is in the instrument's own file,
 * `<Inst>/<Inst>.xml`, beside its `samples/` folder:
 *
 *   <audiofile channel="Snare_top" file="samples/3-Snare.wav" filechannel="10"/>
 *
 * Channels are found by that name, never by position: DRSKit's files order
 * them differently from the list its wiki gives. Pure.
 */

import type { Pick } from '@/scripts/kits/recipe';
import type { SourceId } from '@/scripts/kits/sources';

/** The instrument file that describes a stroke, and the stroke's path as that file names it. */
export function instrumentOf(path: string): { xml: string; file: string } {
  const m = /^(.*\/)?([^/]+)\/samples\/([^/]+)$/.exec(path);
  if (!m) throw new Error(`${path}: not a DrumGizmo stroke (<Inst>/samples/<file>)`);
  const [, parent = '', inst, file] = m;
  return { xml: `${parent}${inst}/${inst}.xml`, file: `samples/${file}` };
}

const attrsOf = (tag: string): Record<string, string> =>
  Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));

/** Each mic's channel in one stroke's file, counted from 1 as DrumGizmo does. */
export function channelsOf(xml: string, file: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const [tag] of xml.matchAll(/<audiofile\b[^>]*>/g)) {
    const a = attrsOf(tag);
    if (a.file !== file) continue;
    const ch = Number(a.filechannel);
    if (!a.channel || !Number.isInteger(ch) || ch < 1) {
      throw new Error(`${file}: an audiofile with no usable channel: ${tag}`);
    }
    out.set(a.channel, ch);
  }
  if (!out.size) throw new Error(`${file}: not in its instrument file`);
  return out;
}

/** An ffmpeg `pan` filter that mixes the named mics to mono at their weights. */
export function panFilter(weights: Record<string, number>, channels: Map<string, number>): string {
  const terms = Object.entries(weights).map(([name, w]) => {
    const ch = channels.get(name);
    if (ch === undefined) {
      throw new Error(`no mic ${name}; this stroke has ${[...channels.keys()].join(', ')}`);
    }
    return `${w}*c${ch - 1}`;
  });
  if (!terms.length) throw new Error('no channels to mix');
  return `pan=mono|c0=${terms.join('+')}`;
}

/**
 * A recipe's pick helper for one DrumGizmo kit: `inst` is the instrument's
 * folder under `root`, and every pick mixes the kit's `shared` mics (its
 * overheads and room) under the instrument's own `channels`, which win where
 * they name the same mic.
 */
export function drumgizmoPicks(
  source: SourceId,
  root: string,
  shared: Record<string, number>
): (
  inst: string,
  channels: Record<string, number>,
  layers: number,
  rr: number,
  range?: [number, number]
) => Pick {
  return (inst, channels, layers, rr, range) => ({
    source,
    pattern: `${root}/${inst}/samples/*-${inst}.wav`,
    mics: { '': 1 },
    channels: { ...shared, ...channels },
    layers,
    rr,
    ...(range ? { range } : {}),
  });
}
