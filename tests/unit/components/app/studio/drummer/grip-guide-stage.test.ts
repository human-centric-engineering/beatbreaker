// @vitest-environment happy-dom

/**
 * `GripGuideStage` — the grip guide's picture: two arms, their hands and
 * sticks, and a snare, playing a lesson. As in `drummer-stage.test.ts`, only
 * the GPU-bound pieces of `three` are faked; the scene, the arms and the
 * lesson's poses are real, so what is asserted is what would be drawn.
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakes = vi.hoisted(() => {
  const renderers: { render: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = [];
  class FakeWebGLRenderer {
    domElement = document.createElement('canvas');
    shadowMap = { enabled: false, type: 0 };
    toneMapping = 0;
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
    constructor() {
      renderers.push(this);
    }
  }
  class FakePMREMGenerator {
    fromScene = vi.fn(() => ({ texture: { dispose: vi.fn() } }));
    dispose = vi.fn();
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

import { GripGuideStage } from '@/components/app/studio/drummer/grip-guide-stage';
import { guideAt, lessonLength, stepStart } from '@/lib/app/breaks/drummer/grip-guide';

let frames: FrameRequestCallback[] = [];
let host: HTMLDivElement;

beforeEach(() => {
  fakes.renderers.length = 0;
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    }
  );
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  vi.unstubAllGlobals();
  host.remove();
});

/** Run the next frame at `ms` on the page's clock. */
function frame(ms: number): void {
  const cb = frames.shift();
  if (!cb) throw new Error('no frame was scheduled');
  cb(ms);
}

/** The scene the renderer last drew. */
function drawn(): THREE.Scene {
  const calls = fakes.renderers[0].render.mock.calls;
  return calls[calls.length - 1][0] as THREE.Scene;
}

describe('GripGuideStage', () => {
  it('draws a snare and two hands, and no body', () => {
    new GripGuideStage(host, { grip: 'american' });
    frame(0);
    const scene = drawn();
    expect(scene.getObjectByName('snare')).toBeDefined();
    const hands: THREE.Object3D[] = [];
    scene.traverse((o) => o.name === 'hand' && hands.push(o));
    expect(hands).toHaveLength(2);
    expect(scene.getObjectByName('kit')).toBeUndefined();
    expect(scene.getObjectByName('drummer')).toBeUndefined();
  });

  it('plays the lesson on its own clock, reporting the time, and poses the hands from it', () => {
    const onTime = vi.fn();
    new GripGuideStage(host, { grip: 'german', onTime });
    frame(1000);
    frame(1100);
    frame(1200);
    expect(onTime).toHaveBeenLastCalledWith(expect.closeTo(0.2, 6));
    let hand: THREE.Object3D | undefined;
    drawn().traverse((o) => {
      if (o.name === 'hand' && !hand) hand = o;
    });
    const want = guideAt('german', 0.2).arms;
    const wrists = [want.lead.wrist, want.other.wrist];
    expect(Math.min(...wrists.map((w) => w.distanceTo(hand!.position)))).toBeLessThan(1e-9);
  });

  it('pauses, seeks to a step, and starts a new grip from its beginning', () => {
    const onTime = vi.fn();
    const stage = new GripGuideStage(host, { grip: 'american', onTime });
    stage.setPlaying(false);
    frame(0);
    frame(500);
    expect(onTime).toHaveBeenLastCalledWith(0);
    stage.seek(stepStart('american', 3));
    frame(600);
    expect(onTime).toHaveBeenLastCalledWith(stepStart('american', 3));
    stage.setGrip('traditional');
    frame(700);
    expect(onTime).toHaveBeenLastCalledWith(0);
    // the same grip again is not a restart
    stage.seek(2);
    stage.setGrip('traditional');
    frame(800);
    expect(onTime).toHaveBeenLastCalledWith(2);
  });

  it('loops the lesson', () => {
    const onTime = vi.fn();
    const stage = new GripGuideStage(host, { grip: 'french', onTime });
    stage.seek(lessonLength('french') - 0.01);
    frame(0);
    frame(50);
    expect(onTime.mock.calls[1][0]).toBeLessThan(0.1);
  });

  it('frees the renderer and its canvas when disposed', () => {
    const stage = new GripGuideStage(host, { grip: 'american' });
    stage.recentre();
    stage.dispose();
    expect(fakes.renderers[0].dispose).toHaveBeenCalled();
    expect(host.querySelector('canvas')).toBeNull();
  });
});
