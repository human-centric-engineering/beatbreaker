/**
 * A believable fake `AudioContext`, for `BreakAudio` (`lib/app/breaks/audio/engine.ts`).
 *
 * There is no Web Audio in the test environment, so a mock that just swallows
 * `createGain()`/`connect()` calls would let the engine build any graph at all
 * and still pass. This fake instead **records** the graph and the scheduled
 * parameter automation so a test can assert what the engine actually built:
 * which nodes it created, how they are wired, and what values/times it
 * scheduled on each `AudioParam`.
 *
 * Every node the context creates is pushed onto `ctx.nodes`, so a test can
 * find a specific node by `kind` (and, for a filter, by `.type`) rather than
 * reaching into `BreakAudio`'s private fields. The one intentionally-omitted
 * private-field bypass: nothing here inspects `bus`/`master`/`lp`/etc. — tests
 * walk the graph the way the engine wired it, starting from the public
 * `audio.bus` and `ctx.destination`.
 *
 * Usage:
 *
 * ```ts
 * import { FakeAudioContext } from '@/tests/helpers/fake-audio-context';
 *
 * beforeEach(() => {
 *   FakeAudioContext.instances.length = 0;
 *   FakeAudioContext.throwOnConstruct = false;
 *   window.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
 * });
 * ```
 */

/** One scheduled automation event on a `FakeAudioParam`. */
export type AutomationEvent =
  | { type: 'setValueAtTime'; value: number; time: number }
  | { type: 'linearRampToValueAtTime'; value: number; time: number }
  | { type: 'exponentialRampToValueAtTime'; value: number; time: number }
  | { type: 'setTargetAtTime'; value: number; time: number; timeConstant: number }
  | { type: 'cancelScheduledValues'; time: number }
  | { type: 'cancelAndHoldAtTime'; time: number };

/**
 * Records every automation call rather than just the current `.value`, so a
 * test can assert the actual envelope/ramp a voice scheduled — e.g. that a
 * kick's pitch drop used `exponentialRampToValueAtTime` at the times and
 * frequencies `engine.ts` computes from the kit table, not just that *some*
 * frequency was eventually set.
 */
export class FakeAudioParam {
  value: number;
  readonly events: AutomationEvent[] = [];

  constructor(initial: number) {
    this.value = initial;
  }

  setValueAtTime(value: number, time: number): FakeAudioParam {
    this.value = value;
    this.events.push({ type: 'setValueAtTime', value, time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): FakeAudioParam {
    this.value = value;
    this.events.push({ type: 'linearRampToValueAtTime', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): FakeAudioParam {
    this.value = value;
    this.events.push({ type: 'exponentialRampToValueAtTime', value, time });
    return this;
  }

  setTargetAtTime(value: number, time: number, timeConstant: number): FakeAudioParam {
    this.value = value;
    this.events.push({ type: 'setTargetAtTime', value, time, timeConstant });
    return this;
  }

  /** Present so `g.gain.cancelAndHoldAtTime` in `chokeHats` takes the real branch. */
  cancelAndHoldAtTime(time: number): FakeAudioParam {
    this.events.push({ type: 'cancelAndHoldAtTime', time });
    return this;
  }

  cancelScheduledValues(time: number): FakeAudioParam {
    this.events.push({ type: 'cancelScheduledValues', time });
    return this;
  }
}

let nextNodeId = 1;

/** Base class: every fake node can connect/disconnect, and records who it feeds. */
export class FakeAudioNode {
  readonly id = nextNodeId++;
  readonly outputs: FakeAudioNode[] = [];

  connect(dest: FakeAudioNode): FakeAudioNode {
    this.outputs.push(dest);
    return dest;
  }

  /**
   * Mirrors the real API: disconnecting a specific destination that isn't
   * currently connected throws `InvalidAccessError`; disconnecting with no
   * argument clears everything unconditionally.
   */
  disconnect(dest?: FakeAudioNode): void {
    if (dest === undefined) {
      this.outputs.length = 0;
      return;
    }
    const i = this.outputs.indexOf(dest);
    if (i === -1) {
      throw new DOMException('the given destination is not connected', 'InvalidAccessError');
    }
    this.outputs.splice(i, 1);
  }
}

export class FakeGainNode extends FakeAudioNode {
  readonly kind = 'gain';
  readonly gain = new FakeAudioParam(1);
}

export class FakeBiquadFilterNode extends FakeAudioNode {
  readonly kind = 'biquad';
  type = 'lowpass';
  readonly frequency = new FakeAudioParam(350);
  readonly Q = new FakeAudioParam(1);
  readonly gain = new FakeAudioParam(0); // used by the highshelf in playBuf()
}

export class FakeDynamicsCompressorNode extends FakeAudioNode {
  readonly kind = 'compressor';
  readonly threshold = new FakeAudioParam(-24);
  readonly knee = new FakeAudioParam(30);
  readonly ratio = new FakeAudioParam(12);
  readonly attack = new FakeAudioParam(0.003);
  readonly release = new FakeAudioParam(0.25);
}

/**
 * `engine.ts` documents (and relies on) the curve being settable exactly once
 * per node — a second assignment throws `InvalidStateError`, which is why
 * `setDrive()` always splices in a brand-new `WaveShaperNode` rather than
 * mutating the old one's curve. Modelled here so that contract is exercised,
 * not assumed.
 */
export class FakeWaveShaperNode extends FakeAudioNode {
  readonly kind = 'waveshaper';
  oversample = 'none';
  private _curve: Float32Array | null = null;

  get curve(): Float32Array | null {
    return this._curve;
  }

  set curve(c: Float32Array | null) {
    if (this._curve !== null) {
      throw new DOMException('curve already set', 'InvalidStateError');
    }
    this._curve = c;
  }
}

export class FakeConvolverNode extends FakeAudioNode {
  readonly kind = 'convolver';
  buffer: FakeAudioBuffer | null = null;
}

export class FakeAudioBuffer {
  readonly numberOfChannels: number;
  readonly length: number;
  readonly sampleRate: number;
  readonly duration: number;
  private readonly channels: Float32Array[];

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }
}

export class FakeAudioBufferSourceNode extends FakeAudioNode {
  readonly kind = 'bufferSource';
  buffer: FakeAudioBuffer | null = null;
  loop = false;
  readonly playbackRate = new FakeAudioParam(1);
  startedAt: number | null = null;
  startOffset = 0;
  stoppedAt: number | null = null;

  start(when = 0, offset = 0): void {
    this.startedAt = when;
    this.startOffset = offset;
  }

  stop(when = 0): void {
    this.stoppedAt = when;
  }
}

export class FakeOscillatorNode extends FakeAudioNode {
  readonly kind = 'oscillator';
  type = 'sine';
  readonly frequency = new FakeAudioParam(440);
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  start(when = 0): void {
    this.startedAt = when;
  }

  stop(when = 0): void {
    this.stoppedAt = when;
  }
}

/**
 * The fake `AudioContext` itself.
 *
 * `window.AudioContext = FakeAudioContext` makes `new AC()` in `init()`
 * produce one of these. `FakeAudioContext.throwOnConstruct` models a browser
 * that refuses to hand out another context (the H7 scenario the engine's
 * `close()` exists for); `instances` lets a test assert exactly how many real
 * contexts got built, which is what "idempotent" and "a fresh graph after
 * close()" actually mean operationally.
 */
export class FakeAudioContext {
  static throwOnConstruct = false;
  /** Every context actually constructed, in order. Reset this in beforeEach. */
  static instances: FakeAudioContext[] = [];

  currentTime = 0;
  readonly sampleRate = 44100;
  state: 'running' | 'suspended' | 'closed' = 'running';
  readonly destination = new FakeAudioNode();
  /** Every node this context has created, in creation order. */
  readonly nodes: FakeAudioNode[] = [];
  closeCalls = 0;
  /** When true, the next close() rejects even though it still tears the context down. */
  closeShouldReject = false;

  constructor() {
    if (FakeAudioContext.throwOnConstruct) {
      throw new Error('no audio hardware available');
    }
    FakeAudioContext.instances.push(this);
  }

  private track<T extends FakeAudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  createGain(): FakeGainNode {
    return this.track(new FakeGainNode());
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    return this.track(new FakeBiquadFilterNode());
  }

  createDynamicsCompressor(): FakeDynamicsCompressorNode {
    return this.track(new FakeDynamicsCompressorNode());
  }

  createWaveShaper(): FakeWaveShaperNode {
    return this.track(new FakeWaveShaperNode());
  }

  createConvolver(): FakeConvolverNode {
    return this.track(new FakeConvolverNode());
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): FakeAudioBuffer {
    return new FakeAudioBuffer(numberOfChannels, length, sampleRate);
  }

  createBufferSource(): FakeAudioBufferSourceNode {
    return this.track(new FakeAudioBufferSourceNode());
  }

  createOscillator(): FakeOscillatorNode {
    return this.track(new FakeOscillatorNode());
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.closeCalls += 1;
    const wasAlreadyClosed = this.state === 'closed';
    this.state = 'closed';
    if (wasAlreadyClosed) {
      return Promise.reject(new DOMException('the context is already closed', 'InvalidStateError'));
    }
    if (this.closeShouldReject) {
      return Promise.reject(new Error('close() failed'));
    }
    return Promise.resolve();
  }
}

/**
 * Find the one node whose output feeds `target` directly. Used to walk the
 * master chain backwards from `ctx.destination` without touching `BreakAudio`
 * private fields — e.g. `feederOf(ctx, ctx.destination)` is the master gain.
 */
export function feederOf(ctx: FakeAudioContext, target: FakeAudioNode): FakeAudioNode | undefined {
  return ctx.nodes.find((n) => n.outputs.includes(target));
}

/** All nodes of a given kind, in creation order — e.g. every oscillator a voice started. */
export function nodesOfKind<T extends FakeAudioNode>(ctx: FakeAudioContext, kind: string): T[] {
  return ctx.nodes.filter((n): n is T => (n as { kind?: string }).kind === kind);
}
