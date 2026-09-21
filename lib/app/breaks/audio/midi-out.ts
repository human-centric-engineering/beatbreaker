import { logger } from '@/lib/logging';

/**
 * Playing the break out of a MIDI port, live.
 *
 * This is the same GM drum map the file export writes (`MIDI_MAP`), sent as it
 * happens rather than saved — so a module or an e-kit plays the break while the
 * page's own kit is muted, and swing and the style's feel arrive with it,
 * because the transport hands over the time it actually scheduled.
 *
 * **The two clocks are not the same clock.** Web Audio schedules against
 * `AudioContext.currentTime`, Web MIDI against the `performance.now()`
 * milliseconds domain. Converting at send time — rather than assuming they tick
 * together — is what keeps a note that swings late in the speakers swing late
 * on the port.
 */

/** What the transport needs from a port. Keeps the clock out of the transport. */
export interface MidiSink {
  /** `at` is an AudioContext time; `vel` is 0–1. */
  hit(note: number, vel: number, at: number): void;
}

/** GM percussion lives on channel 10, which is index 9. */
const CHANNEL = 9;
/** A drum is a one-shot; the note-off only tidies up after it. */
const GATE_MS = 40;

export class MidiOut implements MidiSink {
  private port: MIDIOutput | null = null;

  get name(): string {
    return this.port?.name ?? '';
  }

  get open(): boolean {
    return this.port !== null;
  }

  /**
   * Ask for access and take the first output.
   *
   * Returns the port's name, or an empty string with the reason in `error` —
   * the caller is a toast, and "no interfaces found" is a different sentence
   * from "you said no".
   */
  async connect(): Promise<{ name: string; error: string }> {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      return { name: '', error: 'This browser has no Web MIDI' };
    }
    let access: MIDIAccess;
    try {
      access = await navigator.requestMIDIAccess();
    } catch (error) {
      logger.warn('BeatBreaker: MIDI access refused', { error });
      return { name: '', error: 'MIDI permission refused' };
    }
    const outs = [...access.outputs.values()];
    if (!outs.length) return { name: '', error: 'No MIDI outputs found' };
    this.port = outs[0];
    return { name: this.port.name ?? 'MIDI out', error: '' };
  }

  disconnect(): void {
    this.port = null;
  }

  /**
   * `ctx` is set by whoever owns the AudioContext, because the offset between
   * the two clocks can only be measured against a live one.
   */
  ctx: AudioContext | null = null;

  hit(note: number, vel: number, at: number): void {
    const port = this.port;
    const ctx = this.ctx;
    if (!port || !ctx) return;
    const v = Math.max(1, Math.min(127, Math.round(vel * 127)));
    // audio-clock seconds -> performance.now() milliseconds, measured now
    const when = performance.now() + (at - ctx.currentTime) * 1000;
    try {
      port.send([0x90 | CHANNEL, note, v], when);
      port.send([0x80 | CHANNEL, note, 0], when + GATE_MS);
    } catch (error) {
      logger.warn('BeatBreaker: MIDI send failed', { error });
      this.port = null;
    }
  }
}
