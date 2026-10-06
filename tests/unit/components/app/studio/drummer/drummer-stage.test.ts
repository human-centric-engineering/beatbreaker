// @vitest-environment happy-dom

/**
 * `DrummerStage` — the renderer/scene/loop object a component mounts into a
 * host element.
 *
 * There is no WebGL in the test environment, so `THREE.WebGLRenderer` and
 * `THREE.PMREMGenerator` (both of which need a real GPU context) are
 * replaced with minimal fakes via a partial `vi.mock('three', ...)`.
 * Everything else — the real scene graph, `OrbitControls`, `buildKit()`,
 * `buildDrummer()`, `StrokeTimeline` — runs for real, so what these tests
 * assert on (the timeline's own state, the scene `render()` actually
 * received) is real behaviour, not a second mock echoing the first.
 *
 * `requestAnimationFrame`/`cancelAnimationFrame` are stubbed to hand back
 * control rather than auto-run a loop: a test advances one frame only when
 * it explicitly invokes the callback it captured.
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stepWithHit } from '@/tests/helpers/drummer-fixtures';

const fakes = vi.hoisted(() => {
  const renderers: {
    domElement: HTMLCanvasElement;
    shadowMap: { enabled: boolean; type: number };
    toneMapping: number;
    toneMappingExposure: number;
    setPixelRatio: ReturnType<typeof vi.fn>;
    setSize: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[] = [];

  class FakeWebGLRenderer {
    domElement = document.createElement('canvas');
    shadowMap = { enabled: false, type: 0 };
    toneMapping = 0;
    toneMappingExposure = 1;
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
    constructor() {
      renderers.push(this);
    }
  }

  class FakePMREMGenerator {
    // a stand-in "texture" is enough: drummer-stage.ts only assigns it to
    // `scene.environment` and calls `.dispose()` on it later
    fromScene = vi.fn(() => ({ texture: { dispose: vi.fn() } }));
    dispose = vi.fn();
    constructor() {
      /* takes the renderer; unused by the fake */
    }
  }

  return { renderers, FakeWebGLRenderer, FakePMREMGenerator };
});

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: fakes.FakeWebGLRenderer,
    PMREMGenerator: fakes.FakePMREMGenerator,
  };
});

import { DrummerStage, type StageClock } from '@/components/app/studio/drummer/drummer-stage';

/** `requestAnimationFrame`/`cancelAnimationFrame`, controlled by hand. */
function stubRaf() {
  let nextId = 0;
  const callbacks: FrameRequestCallback[] = [];
  const raf = vi.fn((cb: FrameRequestCallback) => {
    callbacks.push(cb);
    return ++nextId;
  });
  const caf = vi.fn();
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', caf);
  return {
    raf,
    caf,
    /** Run the oldest not-yet-run callback (FIFO), as the browser would. */
    runNextFrame(ms = 16): void {
      const cb = callbacks.shift();
      if (!cb) throw new Error('no frame was scheduled');
      cb(ms);
    },
  };
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(readonly cb: () => void) {
    FakeResizeObserver.instances.push(this);
  }
}

let host: HTMLDivElement;
let clock: StageClock;
let rafCtl: ReturnType<typeof stubRaf>;

beforeEach(() => {
  fakes.renderers.length = 0;
  FakeResizeObserver.instances.length = 0;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  rafCtl = stubRaf();
  host = document.createElement('div');
  document.body.appendChild(host);
  clock = { now: vi.fn(() => 0), latency: vi.fn(() => 0) };
});

afterEach(() => {
  vi.unstubAllGlobals();
  host.remove();
});

describe('DrummerStage', () => {
  it('appends the renderer canvas to the host on construction', () => {
    const stage = new DrummerStage(host, clock);

    const canvas = fakes.renderers[0].domElement;
    expect(host.contains(canvas)).toBe(true);
    void stage; // keep for clarity; disposed implicitly by test end
  });

  it('sizes the renderer against the host on construction', () => {
    new DrummerStage(host, clock);
    expect(fakes.renderers[0].setSize).toHaveBeenCalled();
  });

  it('hears a scheduled step through ingest(), landing it in the public timeline', () => {
    const stage = new DrummerStage(host, clock);
    expect(stage.timeline.all().length).toBe(0);

    stage.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));

    expect(stage.timeline.all().length).toBeGreaterThan(0);
    expect(stage.timeline.clock).not.toBeNull();
  });

  it('resets the timeline when playback stops, but not merely from staying stopped', () => {
    const stage = new DrummerStage(host, clock);
    stage.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));
    expect(stage.timeline.clock).not.toBeNull();

    // calling setPlaying(false) while already not playing must not be what
    // clears it — only the true→false transition does
    stage.setPlaying(false);
    expect(stage.timeline.clock).not.toBeNull();

    stage.setPlaying(true);
    stage.setPlaying(false);

    expect(stage.timeline.clock).toBeNull();
    expect(stage.timeline.all().length).toBe(0);
  });

  it('mirrors the rig in x when set lefty, visible in the scene the renderer actually draws', () => {
    const stage = new DrummerStage(host, clock);

    rafCtl.runNextFrame();
    const sceneDrawn = fakes.renderers[0].render.mock.calls[0]?.[0] as THREE.Scene;
    expect(sceneDrawn).toBeInstanceOf(THREE.Scene);

    const kit = sceneDrawn.getObjectByName('kit');
    expect(kit).toBeDefined();
    const rig = kit!.parent!;
    expect(rig.scale.x).toBe(1);

    stage.setLefty(true);
    expect(rig.scale.x).toBe(-1);

    // idempotent — setting the same value again does not toggle it back
    stage.setLefty(true);
    expect(rig.scale.x).toBe(-1);

    stage.setLefty(false);
    expect(rig.scale.x).toBe(1);
  });

  it('draws the hands in the grip it is set to, from the next frame', () => {
    const stage = new DrummerStage(host, clock);
    rafCtl.runNextFrame(16);
    const scene = fakes.renderers[0].render.mock.calls[0]?.[0] as THREE.Scene;
    const drummer = scene.getObjectByName('drummer')!;
    // the two hands: the root's groups with a palm and five digits; the other hand is on the left
    const hands = drummer.children.filter(
      (o): o is THREE.Group =>
        o instanceof THREE.Group &&
        o.children.length === 6 &&
        (o.children[0] as THREE.Mesh).geometry?.type === 'RoundedBoxGeometry'
    );
    expect(hands).toHaveLength(2);
    const other = () => hands.reduce((a, b) => (a.position.x < b.position.x ? a : b));
    const backY = () => new THREE.Vector3(0, 1, 0).applyQuaternion(other().quaternion).y;
    expect(backY()).toBeGreaterThan(0); // matched: the back of the hand up

    stage.setGrips({ lead: 'matched', other: 'military' });
    rafCtl.runNextFrame(32);
    expect(backY()).toBeLessThan(0); // military: palm up

    stage.setGrips({ lead: 'matched', other: 'matched' });
    rafCtl.runNextFrame(48);
    expect(backY()).toBeGreaterThan(0);
  });

  it('removes the canvas from the host and cancels the frame on dispose', () => {
    const stage = new DrummerStage(host, clock);
    const canvas = fakes.renderers[0].domElement;
    expect(host.contains(canvas)).toBe(true);

    stage.dispose();

    expect(host.contains(canvas)).toBe(false);
    expect(rafCtl.caf).toHaveBeenCalledWith(rafCtl.raf.mock.results[0]?.value);
    expect(fakes.renderers[0].dispose).toHaveBeenCalled();
  });

  it('observes the host for resize and disconnects on dispose', () => {
    const stage = new DrummerStage(host, clock);
    expect(FakeResizeObserver.instances.length).toBe(1);
    expect(FakeResizeObserver.instances[0].observe).toHaveBeenCalledWith(host);

    stage.dispose();
    expect(FakeResizeObserver.instances[0].disconnect).toHaveBeenCalled();
  });
});
