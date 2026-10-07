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
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';

const fakes = vi.hoisted(() => {
  const instances: {
    host: HTMLElement;
    persona: { name: string };
    setLefty: ReturnType<typeof vi.fn>;
    setGrips: ReturnType<typeof vi.fn>;
    setPersona: ReturnType<typeof vi.fn>;
    setPlaying: ReturnType<typeof vi.fn>;
    flyTo: ReturnType<typeof vi.fn>;
    ingest: (step: ScheduledStep) => void;
    dispose: ReturnType<typeof vi.fn>;
  }[] = [];

  class FakeDrummerStage {
    setLefty = vi.fn();
    setGrips = vi.fn();
    setPersona = vi.fn();
    setPlaying = vi.fn();
    flyTo = vi.fn();
    ingest = vi.fn();
    dispose = vi.fn();
    constructor(
      public host: HTMLElement,
      public clock: unknown,
      public persona: { name: string }
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
        military="none"
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
        military="none"
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
    expect(stage.setGrips).toHaveBeenCalledWith({ lead: 'matched', other: 'matched' });
    expect(stage.setPlaying).toHaveBeenCalledWith(true);
    expect(stage.flyTo).toHaveBeenCalledWith('hands');
  });

  it('flies back to the same view when only viewSeq is bumped (Re-centre)', () => {
    const { subscribeSteps } = listeners();
    const props = {
      lefty: false,
      military: 'none' as const,
      view: 'front' as const,
      playing: false,
      subscribeSteps,
      audioNow: stableAudioNow,
      audioLatency: stableAudioLatency,
    };
    const { rerender } = render(<DrummerCanvas {...props} viewSeq={0} />);
    const stage = fakes.instances[0];
    const before = stage.flyTo.mock.calls.length;
    rerender(<DrummerCanvas {...props} viewSeq={1} />);
    expect(stage.flyTo.mock.calls.length).toBe(before + 1);
    expect(stage.flyTo).toHaveBeenLastCalledWith('front');
  });

  it('subscribes to steps and feeds the stage ingest, then unsubscribes and disposes on unmount', () => {
    const { subs, subscribeSteps } = listeners();
    const { unmount } = render(
      <DrummerCanvas
        lefty={false}
        military="none"
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
        military="none"
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
        military="none"
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
        military="none"
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
        military="none"
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

  it('forwards a grip change to setGrips as each hand’s grip, and not again for the same setting', () => {
    const { subscribeSteps } = listeners();
    const props = {
      lefty: false,
      view: 'front' as const,
      viewSeq: 0,
      playing: false,
      subscribeSteps,
      audioNow: stableAudioNow,
      audioLatency: stableAudioLatency,
    };
    const { rerender } = render(<DrummerCanvas {...props} military="none" />);
    const stage = fakes.instances[0];
    stage.setGrips.mockClear();

    rerender(<DrummerCanvas {...props} military="other" />);
    expect(stage.setGrips).toHaveBeenLastCalledWith({ lead: 'matched', other: 'military' });

    rerender(<DrummerCanvas {...props} military="both" />);
    expect(stage.setGrips).toHaveBeenLastCalledWith({ lead: 'military', other: 'military' });

    // a re-render with the same setting is not a new grip
    const calls = stage.setGrips.mock.calls.length;
    rerender(<DrummerCanvas {...props} military="both" playing />);
    expect(stage.setGrips.mock.calls.length).toBe(calls);
    expect(fakes.instances.length).toBe(1);
  });

  it('flies to a new view when the view prop changes', () => {
    const { subscribeSteps } = listeners();
    const { rerender } = render(
      <DrummerCanvas
        lefty={false}
        military="none"
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
        military="none"
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
        military="none"
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
        military="none"
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
        military="none"
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
        military="none"
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

describe('DrummerCanvas — who is playing', () => {
  it('seats a player from the cast, names them, and keeps them when the scene is rebuilt', () => {
    const a = listeners();
    const props = {
      lefty: false,
      military: 'none' as const,
      view: 'front' as const,
      viewSeq: 0,
      playing: false,
      audioNow: stableAudioNow,
      audioLatency: stableAudioLatency,
    };
    const { rerender, container } = render(
      <DrummerCanvas {...props} subscribeSteps={a.subscribeSteps} />
    );
    const first = fakes.instances[0].persona;
    expect(PERSONAS).toContain(first);
    expect(container.querySelector('.drummer-name')?.textContent).toBe(`On the kit: ${first.name}`);
    expect(container.querySelector('.drummer-canvas')?.getAttribute('aria-label')).toContain(
      first.name
    );

    // a new subscription rebuilds the stage: the same player sits back down
    const b = listeners();
    rerender(<DrummerCanvas {...props} subscribeSteps={b.subscribeSteps} />);
    expect(fakes.instances.length).toBe(2);
    expect(fakes.instances[1].persona).toBe(first);
  });

  it('seats somebody new when the view opens again', () => {
    const { subscribeSteps } = listeners();
    const props = {
      lefty: false,
      military: 'none' as const,
      view: 'front' as const,
      viewSeq: 0,
      playing: false,
      subscribeSteps,
      audioNow: stableAudioNow,
      audioLatency: stableAudioLatency,
    };
    const one = render(<DrummerCanvas {...props} />);
    one.unmount();
    render(<DrummerCanvas {...props} />);
    expect(fakes.instances[1].persona).not.toBe(fakes.instances[0].persona);
  });

  it('seats someone else on Shuffle, in the same stage, and names them', () => {
    const { subscribeSteps } = listeners();
    const props = {
      lefty: false,
      military: 'none' as const,
      view: 'front' as const,
      viewSeq: 0,
      playing: true,
      subscribeSteps,
      audioNow: stableAudioNow,
      audioLatency: stableAudioLatency,
    };
    const { rerender, container } = render(<DrummerCanvas {...props} shuffleSeq={0} />);
    const stage = fakes.instances[0];
    const first = stage.persona;

    rerender(<DrummerCanvas {...props} shuffleSeq={1} />);
    expect(fakes.instances).toHaveLength(1);
    const next = stage.setPersona.mock.lastCall?.[0] as { name: string };
    expect(next).not.toBe(first);
    expect(PERSONAS).toContain(next);
    expect(container.querySelector('.drummer-name')?.textContent).toBe(`On the kit: ${next.name}`);

    // an unrelated re-render does not shuffle again
    const calls = stage.setPersona.mock.calls.length;
    rerender(<DrummerCanvas {...props} shuffleSeq={1} playing={false} />);
    expect(stage.setPersona.mock.calls.length).toBe(calls);
  });

  it('seats somebody new on the first Shuffle in a tab under Strict Mode, which renders twice', async () => {
    // a fresh tab: nobody has sat at the kit yet
    vi.resetModules();
    const { default: FreshCanvas } = await import('@/components/app/studio/drummer/drummer-canvas');
    const { subscribeSteps } = listeners();
    const props = {
      lefty: false,
      military: 'none' as const,
      view: 'front' as const,
      viewSeq: 0,
      playing: false,
      subscribeSteps,
      audioNow: stableAudioNow,
      audioLatency: stableAudioLatency,
    };
    const named = (c: HTMLElement) => c.querySelector('.drummer-name')?.textContent;
    const { rerender, container } = render(
      <StrictMode>
        <FreshCanvas {...props} shuffleSeq={0} />
      </StrictMode>
    );
    expect(named(container)).toBe('On the kit: The Original');
    // the first of whoever is left: The Original again, unless Shuffle knows it is on screen
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      for (let seq = 1; seq <= 5; seq++) {
        const before = named(container);
        rerender(
          <StrictMode>
            <FreshCanvas {...props} shuffleSeq={seq} />
          </StrictMode>
        );
        expect(named(container)).not.toBe(before);
      }
    } finally {
      random.mockRestore();
    }
  });
});
