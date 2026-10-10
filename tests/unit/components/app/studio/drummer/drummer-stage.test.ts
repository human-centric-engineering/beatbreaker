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
import { cameraFor } from '@/lib/app/breaks/drummer/camera';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';

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

  it('seats the player it is given, and swaps them mid-groove without touching the kit or the timeline', () => {
    const [first, second] = PERSONAS;
    const stage = new DrummerStage(host, clock, first);
    expect(stage.persona).toBe(first);
    stage.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));
    rafCtl.runNextFrame(16);
    const scene = fakes.renderers[0].render.mock.calls[0]?.[0] as THREE.Scene;
    const kit = scene.getObjectByName('kit');
    const oldDrummer = scene.getObjectByName('drummer')!;
    const disposed = vi.fn();
    oldDrummer.traverse((o) => {
      if (o instanceof THREE.Mesh)
        (o.geometry as THREE.BufferGeometry).addEventListener('dispose', disposed);
    });

    stage.setPersona(second);
    expect(stage.persona).toBe(second);
    const drummers: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.name === 'drummer') drummers.push(o);
    });
    // one drummer on the stool, the new one; the old one's geometry freed
    expect(drummers).toHaveLength(1);
    expect(drummers[0]).not.toBe(oldDrummer);
    expect(disposed).toHaveBeenCalled();
    expect(scene.getObjectByName('kit')).toBe(kit);
    expect(stage.timeline.clock).not.toBeNull();

    // the same player again is no change
    stage.setPersona(second);
    expect(scene.getObjectByName('drummer')).toBe(drummers[0]);
  });

  it('seats the skeleton as bones, whether it opens the show or sits down mid-groove', () => {
    const bones = PERSONAS.find((p) => p.kind === 'skeleton')!;
    const isSkeleton = (scene: THREE.Scene) => {
      let vertebrae = 0;
      scene.getObjectByName('drummer')!.traverse((o) => {
        if (o.name === 'vertebra') vertebrae++;
      });
      return vertebrae === 24;
    };
    const opened = new DrummerStage(host, clock, bones);
    rafCtl.runNextFrame(16);
    const first = fakes.renderers[0].render.mock.calls[0]?.[0] as THREE.Scene;
    expect(isSkeleton(first)).toBe(true);
    opened.setPersona(PERSONAS[0]);
    expect(isSkeleton(first)).toBe(false);
    opened.setPersona(bones);
    expect(isSkeleton(first)).toBe(true);
  });

  it("paints the kit in the player's colours, and repaints the same kit for the next one", () => {
    const [first, second] = PERSONAS;
    const stage = new DrummerStage(host, clock, first);
    rafCtl.runNextFrame(16);
    const scene = fakes.renderers[0].render.mock.calls[0]?.[0] as THREE.Scene;
    const kit = scene.getObjectByName('kit')!;
    // the mat: the widest disc in the kit
    const rug = kit.children.find(
      (o): o is THREE.Mesh => o instanceof THREE.Mesh && o.geometry instanceof THREE.CircleGeometry
    )!;
    const paint = () => (rug.material as THREE.MeshStandardMaterial).color.getHexString();
    expect(paint()).toBe(first.kit.rug.slice(1));

    stage.setPersona(second);
    expect(scene.getObjectByName('kit')).toBe(kit);
    expect(paint()).toBe(second.kit.rug.slice(1));
  });

  it('draws the hands in the grip it is set to, from the next frame', () => {
    const stage = new DrummerStage(host, clock);
    rafCtl.runNextFrame(16);
    const scene = fakes.renderers[0].render.mock.calls[0]?.[0] as THREE.Scene;
    const drummer = scene.getObjectByName('drummer')!;
    // the two hands; the other hand is on the left
    const hands = drummer.children.filter(
      (o): o is THREE.Group => o instanceof THREE.Group && o.name === 'hand'
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

  it('caps the pixel ratio, and takes a missing one as 1', () => {
    vi.stubGlobal('devicePixelRatio', 3);
    new DrummerStage(host, clock);
    expect(fakes.renderers[0].setPixelRatio).toHaveBeenCalledWith(1.75);

    vi.stubGlobal('devicePixelRatio', 0);
    new DrummerStage(host, clock);
    expect(fakes.renderers[1].setPixelRatio).toHaveBeenCalledWith(1);
  });

  it('refits the renderer to the host when the host is resized', () => {
    new DrummerStage(host, clock);
    Object.defineProperty(host, 'clientWidth', { value: 640, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 360, configurable: true });

    FakeResizeObserver.instances[0].cb();

    expect(fakes.renderers[0].setSize).toHaveBeenLastCalledWith(640, 360, false);
  });

  it('flies the camera to a view over most of a second, and stops there', () => {
    const stage = new DrummerStage(host, clock);
    rafCtl.runNextFrame(0);
    const camera = () => fakes.renderers[0].render.mock.lastCall?.[1] as THREE.PerspectiveCamera;
    const shot = new THREE.Vector3(...cameraFor('above', false).position);

    stage.flyTo('above');
    rafCtl.runNextFrame(100);
    const partWay = camera().position.distanceTo(shot);
    expect(partWay).toBeGreaterThan(0.05);

    for (let ms = 200; ms <= 1200; ms += 100) rafCtl.runNextFrame(ms);
    expect(camera().position.distanceTo(shot)).toBeLessThan(0.05);
  });

  it('slides the drummer left for the chart, over a moment, and back to the middle', () => {
    Object.defineProperty(host, 'clientWidth', { value: 1000, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 500, configurable: true });
    const stage = new DrummerStage(host, clock);
    // (a first frame at 0 ms would leave the next one with no time gone by)
    rafCtl.runNextFrame(16);
    const camera = () => fakes.renderers[0].render.mock.lastCall?.[1] as THREE.PerspectiveCamera;
    expect(camera().view?.enabled ?? false).toBe(false);

    stage.setAside(true);
    rafCtl.runNextFrame(100);
    const partWay = camera().view?.offsetX ?? 0;
    expect(partWay).toBeGreaterThan(0);
    for (let ms = 200; ms <= 4000; ms += 100) rafCtl.runNextFrame(ms);
    // the frame cut from further right: the kit sits left of centre
    const aside = camera().view?.offsetX ?? 0;
    expect(aside).toBeGreaterThan(partWay);
    expect(aside).toBeCloseTo(160, 0);
    expect(camera().view?.fullWidth).toBe(1000);

    stage.setAside(false);
    for (let ms = 4100; ms <= 8000; ms += 100) rafCtl.runNextFrame(ms);
    expect(camera().view?.enabled ?? false).toBe(false);
  });

  it('puts the drummer aside at once when asked to snap, as a new stage is', () => {
    Object.defineProperty(host, 'clientWidth', { value: 1000, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 500, configurable: true });
    const stage = new DrummerStage(host, clock);
    stage.setAside(true, true);
    rafCtl.runNextFrame(16);
    const camera = () => fakes.renderers[0].render.mock.lastCall?.[1] as THREE.PerspectiveCamera;
    expect(camera().view?.offsetX).toBeCloseTo(160, 5);
  });

  it('gives up the flight the moment the viewer grabs the camera', () => {
    const stage = new DrummerStage(host, clock);
    rafCtl.runNextFrame(0);
    const camera = () => fakes.renderers[0].render.mock.lastCall?.[1] as THREE.PerspectiveCamera;

    stage.flyTo('above');
    rafCtl.runNextFrame(100);
    const grabbed = camera().position.clone();
    fakes.renderers[0].domElement.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, button: 0, pointerType: 'mouse' })
    );
    for (let ms = 200; ms <= 1200; ms += 100) rafCtl.runNextFrame(ms);

    expect(camera().position.distanceTo(grabbed)).toBeLessThan(0.05);
  });

  it('observes the host for resize and disconnects on dispose', () => {
    const stage = new DrummerStage(host, clock);
    expect(FakeResizeObserver.instances.length).toBe(1);
    expect(FakeResizeObserver.instances[0].observe).toHaveBeenCalledWith(host);

    stage.dispose();
    expect(FakeResizeObserver.instances[0].disconnect).toHaveBeenCalled();
  });
});
