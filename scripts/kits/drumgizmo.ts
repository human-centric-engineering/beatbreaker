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
