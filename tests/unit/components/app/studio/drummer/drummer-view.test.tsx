// @vitest-environment happy-dom

/**
 * `DrummerView` — the 3D drummer's controls (hand, camera, re-centre) and the
 * gate that decides whether the canvas or a "no WebGL" message shows.
 *
 * `useStudio()` is replaced with a hand-built fake (as
 * `stage-playhead.test.tsx` does for `Stage`), `next/dynamic` is replaced
 * with a stub that renders its props as data attributes (as
 * `visualize-tab.test.tsx` does), and the WebGL probe is exercised for real
 * against `HTMLCanvasElement.prototype.getContext` — stubbed per test,
 * because `hasWebGL()` caches its answer in a module-level variable that
 * only `vi.resetModules()` + a fresh dynamic import can clear.
 */

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Studio } from '@/components/app/studio/studio-provider';

let fakeStudio: Studio;

vi.mock('@/components/app/studio/studio-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/app/studio/studio-provider')>();
  return { ...actual, useStudio: () => fakeStudio };
});

let capturedCanvasProps: Record<string, unknown> | null = null;
let capturedDynamic: {
  loader: () => Promise<unknown>;
  options: { ssr?: boolean; loading?: () => React.ReactNode };
} | null = null;

vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<unknown>,
    options: { ssr?: boolean; loading?: () => React.ReactNode }
  ) => {
    capturedDynamic = { loader, options };
    return (props: Record<string, unknown>) => {
      capturedCanvasProps = props;
      return (
        <div
          data-testid="drummer-canvas-stub"
          data-lefty={String(props.lefty)}
          data-military={String(props.military)}
          data-view={String(props.view)}
          data-view-seq={String(props.viewSeq)}
          data-playing={String(props.playing)}
        />
      );
    };
  },
}));

beforeEach(() => {
  localStorage.clear();
  capturedCanvasProps = null;
  fakeStudio = {
    playing: false,
    subscribeSteps: vi.fn(() => vi.fn()),
    audioNow: vi.fn(() => 0),
    audioLatency: vi.fn(() => 0),
  } as unknown as Studio;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

/** Stub WebGL as present/absent on `HTMLCanvasElement`, for the next import. */
function stubWebGL(available: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((type: string) => {
    if (!available) return null;
    return type === 'webgl2' || type === 'webgl' ? ({} as unknown) : null;
  }) as typeof HTMLCanvasElement.prototype.getContext);
}

/** `hasWebGL()` caches its answer at module scope: reset modules and re-import. */
async function loadDrummerView() {
  vi.resetModules();
  const mod = await import('@/components/app/studio/drummer/drummer-view');
  return mod.DrummerView;
}

describe('DrummerView, loading the canvas', () => {
  it('loads the canvas on the client only, saying so while it does', async () => {
    stubWebGL(true);
    await loadDrummerView();
    expect(capturedDynamic?.options.ssr).toBe(false);

    render(<>{capturedDynamic?.options.loading?.()}</>);
    expect(screen.getByText('Setting up the kit…')).toBeInTheDocument();

    const mod = await capturedDynamic?.loader();
    expect(mod).toHaveProperty('default', expect.any(Function));
  });

  it('renders the canvas, not the no-WebGL message, on the server', async () => {
    const { renderToString } = await import('react-dom/server');
    const DrummerView = await loadDrummerView();
    const html = renderToString(<DrummerView />);
    expect(html).toContain('drummer-canvas-stub');
    expect(html).not.toMatch(/can.t draw 3D/);
  });
});

describe('DrummerView, with WebGL available', () => {
  it('renders the canvas with the default hand, camera view and playing state', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    render(<DrummerView />);

    const canvas = await screen.findByTestId('drummer-canvas-stub');
    expect(canvas).toHaveAttribute('data-lefty', 'false'); // default hand: right
    expect(canvas).toHaveAttribute('data-military', 'none'); // default grip: matched
    expect(canvas).toHaveAttribute('data-view', 'front');
    expect(canvas).toHaveAttribute('data-view-seq', '0');
    expect(canvas).toHaveAttribute('data-playing', 'false');
    expect(screen.queryByText(/can.t draw 3D/)).not.toBeInTheDocument();
  });

  it('shows the "Press Play" cue only while not playing', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    fakeStudio.playing = false;
    const { rerender } = render(<DrummerView />);
    expect(screen.getByText(/Press Play/)).toBeInTheDocument();

    fakeStudio = { ...fakeStudio, playing: true };
    rerender(<DrummerView />);
    expect(screen.queryByText(/Press Play/)).not.toBeInTheDocument();
  });

  it('switches to left-handed, persists it to localStorage, and passes lefty to the canvas', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);

    const hand = within(screen.getByRole('radiogroup', { name: 'Kit set up for' }));
    await user.click(hand.getByRole('radio', { name: 'Left-handed' }));

    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute('data-lefty', 'true');
    expect(JSON.parse(localStorage.getItem('bb.drummerHand') ?? 'null')).toBe('left');
  });

  it('remembers a stored left-handed setting across a remount', async () => {
    stubWebGL(true);
    localStorage.setItem('bb.drummerHand', JSON.stringify('left'));
    const DrummerView = await loadDrummerView();
    render(<DrummerView />);

    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute('data-lefty', 'true');
  });

  it('switches to a military grip, persists it, and passes it to the canvas', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);

    const grip = within(screen.getByRole('radiogroup', { name: 'Grip' }));
    await user.click(grip.getByRole('radio', { name: 'Military (left)' }));
    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute(
      'data-military',
      'other'
    );
    expect(JSON.parse(localStorage.getItem('bb.drummerGrip') ?? 'null')).toBe('other');

    await user.click(grip.getByRole('radio', { name: 'Military (both)' }));
    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute(
      'data-military',
      'both'
    );
  });

  it('names the off hand by the kit: the right hand on a left-handed kit', async () => {
    stubWebGL(true);
    localStorage.setItem('bb.drummerHand', JSON.stringify('left'));
    localStorage.setItem('bb.drummerGrip', JSON.stringify('other'));
    const DrummerView = await loadDrummerView();
    render(<DrummerView />);

    const grip = within(screen.getByRole('radiogroup', { name: 'Grip' }));
    expect(grip.getByRole('radio', { name: 'Military (right)' })).toBeChecked();
    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute(
      'data-military',
      'other'
    );
  });

  it('changes the camera view and bumps viewSeq each time it is chosen', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);

    const camera = within(screen.getByRole('radiogroup', { name: 'Camera' }));
    await user.click(camera.getByRole('radio', { name: 'Side' }));

    let canvas = await screen.findByTestId('drummer-canvas-stub');
    expect(canvas).toHaveAttribute('data-view', 'side');
    expect(canvas).toHaveAttribute('data-view-seq', '1');

    await user.click(camera.getByRole('radio', { name: 'Hands' }));
    canvas = await screen.findByTestId('drummer-canvas-stub');
    expect(canvas).toHaveAttribute('data-view', 'hands');
    expect(canvas).toHaveAttribute('data-view-seq', '2');
  });

  it('bumps viewSeq on Re-centre without changing the view', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);

    await user.click(screen.getByRole('button', { name: 'Re-centre' }));

    const canvas = await screen.findByTestId('drummer-canvas-stub');
    expect(canvas).toHaveAttribute('data-view', 'front');
    expect(canvas).toHaveAttribute('data-view-seq', '1');

    await user.click(screen.getByRole('button', { name: 'Re-centre' }));
    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute('data-view-seq', '2');
  });

  it('bumps shuffleSeq on Shuffle drummer, and nothing else', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);
    await screen.findByTestId('drummer-canvas-stub');
    expect(capturedCanvasProps?.shuffleSeq).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Shuffle drummer' }));
    expect(capturedCanvasProps?.shuffleSeq).toBe(1);
    expect(capturedCanvasProps?.viewSeq).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Shuffle drummer' }));
    expect(capturedCanvasProps?.shuffleSeq).toBe(2);
  });

  it('forwards the studio subscribeSteps/audioNow/audioLatency through to the canvas', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    render(<DrummerView />);
    await screen.findByTestId('drummer-canvas-stub');

    expect(capturedCanvasProps?.subscribeSteps).toBe(fakeStudio.subscribeSteps);
    expect(capturedCanvasProps?.audioNow).toBe(fakeStudio.audioNow);
    expect(capturedCanvasProps?.audioLatency).toBe(fakeStudio.audioLatency);
  });
});

describe('DrummerView, with no WebGL', () => {
  it('shows the "can\'t draw 3D" message instead of the canvas, and no Press Play cue duplication', async () => {
    stubWebGL(false);
    const DrummerView = await loadDrummerView();
    await act(async () => {
      render(<DrummerView />);
    });

    expect(screen.getByText(/can.t draw 3D/i)).toBeInTheDocument();
    expect(screen.queryByTestId('drummer-canvas-stub')).not.toBeInTheDocument();
    // the chart still plays — the control row (hand/camera) is unaffected
    expect(screen.getByRole('radiogroup', { name: 'Kit set up for' })).toBeInTheDocument();
  });
});
