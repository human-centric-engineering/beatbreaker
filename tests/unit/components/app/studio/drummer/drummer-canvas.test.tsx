// @vitest-environment happy-dom

/**
 * `DrummerCanvas` — the thin host/lifecycle wrapper around `DrummerStage`.
 *
 * `DrummerStage` itself is covered in `drummer-stage.test.ts` (it needs its
 * own WebGL-renderer fakes); here it is replaced wholesale by a small
 * recording fake, so this file only proves what `DrummerCanvas` itself is
 * responsible for: constructing one stage against the host div, wiring
 * `subscribeSteps`, disposing on unmount, and forwarding prop changes to the
 * right imperative call.
 */

import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';

const fakes = vi.hoisted(() => {
  const instances: {
    host: HTMLElement;
    setLefty: ReturnType<typeof vi.fn>;
    setPlaying: ReturnType<typeof vi.fn>;
    flyTo: ReturnType<typeof vi.fn>;
    ingest: (step: ScheduledStep) => void;
    dispose: ReturnType<typeof vi.fn>;
  }[] = [];

  class FakeDrummerStage {
    setLefty = vi.fn();
    setPlaying = vi.fn();
    flyTo = vi.fn();
    ingest = vi.fn();
    dispose = vi.fn();
    constructor(
      public host: HTMLElement,
      public clock: unknown
    ) {
      instances.push(this);
    }
  }

  return { instances, FakeDrummerStage };
});

vi.mock('@/components/app/studio/drummer/drummer-stage', () => ({
  DrummerStage: fakes.FakeDrummerStage,
}));

import DrummerCanvas from '@/components/app/studio/drummer/drummer-canvas';

beforeEach(() => {
  fakes.instances.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const stableAudioNow = () => 0;
const stableAudioLatency = () => 0;

const listeners = () => {
  const subs = new Set<(step: ScheduledStep) => void>();
  const subscribeSteps = vi.fn((listener: (step: ScheduledStep) => void) => {
    subs.add(listener);
    return vi.fn(() => subs.delete(listener));
  });
  return { subs, subscribeSteps };
};

describe('DrummerCanvas', () => {
  it('constructs exactly one DrummerStage against its host div', () => {
    const { subscribeSteps } = listeners();
    const { container } = render(
      <DrummerCanvas
        lefty={false}
        view="front"
        viewSeq={0}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );

    expect(fakes.instances.length).toBe(1);
    const host = container.querySelector('.drummer-canvas');
    expect(host).not.toBeNull();
    expect(fakes.instances[0].host).toBe(host);
  });

  it('applies the initial lefty/playing/view props immediately after construction', () => {
    const { subscribeSteps } = listeners();
    render(
      <DrummerCanvas
        lefty={true}
        view="hands"
        viewSeq={0}
        playing={true}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );

    const stage = fakes.instances[0];
    expect(stage.setLefty).toHaveBeenCalledWith(true);
    expect(stage.setPlaying).toHaveBeenCalledWith(true);
    expect(stage.flyTo).toHaveBeenCalledWith('hands');
  });

  it('subscribes to steps and feeds the stage ingest, then unsubscribes and disposes on unmount', () => {
    const { subs, subscribeSteps } = listeners();
    const { unmount } = render(
      <DrummerCanvas
        lefty={false}
        view="front"
        viewSeq={0}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );

    expect(subscribeSteps).toHaveBeenCalledTimes(1);
    expect(subs.size).toBe(1);
    const stage = fakes.instances[0];
    // the listener subscribed IS the stage's own ingest — a step reaches it directly
    const step = { t: 0 } as unknown as ScheduledStep;
    [...subs][0](step);
    expect(stage.ingest).toHaveBeenCalledWith(step);

    unmount();

    expect(subs.size).toBe(0); // unsubscribed
    expect(stage.dispose).toHaveBeenCalledTimes(1);
  });

  it('forwards a playing change to setPlaying without re-constructing the stage', () => {
    const { subscribeSteps } = listeners();
    const { rerender } = render(
      <DrummerCanvas
        lefty={false}
        view="front"
        viewSeq={0}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );
    const stage = fakes.instances[0];
    stage.setPlaying.mockClear();

    rerender(
      <DrummerCanvas
        lefty={false}
        view="front"
        viewSeq={0}
        playing={true}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );

    expect(fakes.instances.length).toBe(1); // no second stage
    expect(stage.setPlaying).toHaveBeenCalledWith(true);
  });

  it('forwards a lefty change to setLefty', () => {
    const { subscribeSteps } = listeners();
    const { rerender } = render(
      <DrummerCanvas
        lefty={false}
        view="front"
        viewSeq={0}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );
    const stage = fakes.instances[0];
    stage.setLefty.mockClear();

    rerender(
      <DrummerCanvas
        lefty={true}
        view="front"
        viewSeq={0}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );

    expect(stage.setLefty).toHaveBeenCalledWith(true);
  });

  it('flies to a new view when the view prop changes', () => {
    const { subscribeSteps } = listeners();
    const { rerender } = render(
      <DrummerCanvas
        lefty={false}
        view="front"
        viewSeq={0}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );
    const stage = fakes.instances[0];
    stage.flyTo.mockClear();

    rerender(
      <DrummerCanvas
        lefty={false}
        view="seat"
        viewSeq={0}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );

    expect(stage.flyTo).toHaveBeenCalledWith('seat');
  });

  it('flies back to the same view again when viewSeq is bumped with the view unchanged', () => {
    const { subscribeSteps } = listeners();
    const { rerender } = render(
      <DrummerCanvas
        lefty={false}
        view="front"
        viewSeq={0}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );
    const stage = fakes.instances[0];
    stage.flyTo.mockClear();

    rerender(
      <DrummerCanvas
        lefty={false}
        view="front"
        viewSeq={1}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );

    expect(stage.flyTo).toHaveBeenCalledWith('front');
  });

  it('does not re-subscribe when only lefty/playing/view change, keeping one subscription for the mount', () => {
    const { subscribeSteps } = listeners();
    const { rerender } = render(
      <DrummerCanvas
        lefty={false}
        view="front"
        viewSeq={0}
        playing={false}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );

    rerender(
      <DrummerCanvas
        lefty={true}
        view="side"
        viewSeq={2}
        playing={true}
        subscribeSteps={subscribeSteps}
        audioNow={stableAudioNow}
        audioLatency={stableAudioLatency}
      />
    );

    expect(subscribeSteps).toHaveBeenCalledTimes(1);
    expect(fakes.instances.length).toBe(1);
  });
});
