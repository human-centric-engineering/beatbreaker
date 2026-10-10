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
import { generatePattern } from '@/lib/app/breaks/generate';
import { testStyle } from '@/tests/helpers/catalogue';
import { openMenu, pickOption } from '@/tests/helpers/select-menu';

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
          data-grip={String(props.grip)}
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
    // no pattern: the corner chart is mounted but draws nothing (drummer-chart.test.tsx draws it)
    view: { A: null, B: null },
    viewMode: 'A',
    arrangement: ['A'],
    position: null,
    bpm: 100,
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
    expect(canvas).toHaveAttribute('data-grip', 'american'); // default grip: American matched
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

  it('offers the matched and traditional grips, persists the pick, and passes it to the canvas', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);

    const grip = screen.getByRole('combobox', { name: 'Grip' });
    const menu = await openMenu(user, grip);
    expect(
      within(menu)
        .getAllByRole('option')
        .map((o) => o.getAttribute('data-value'))
    ).toEqual(['american', 'german', 'french', 'traditional', 'traditionalBoth']);
    await pickOption(user, grip, 'german');
    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute('data-grip', 'german');
    expect(JSON.parse(localStorage.getItem('bb.drummerGrip') ?? 'null')).toBe('german');

    await pickOption(user, grip, 'traditional');
    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute(
      'data-grip',
      'traditional'
    );
    expect(grip).toHaveTextContent('Traditional (left)');
  });

  it('names the off hand by the kit, and reads a grip stored the old way as the grip it was', async () => {
    stubWebGL(true);
    localStorage.setItem('bb.drummerHand', JSON.stringify('left'));
    // before the matched grips had names, this said traditional in the hand off the hats
    localStorage.setItem('bb.drummerGrip', JSON.stringify('other'));
    const DrummerView = await loadDrummerView();
    render(<DrummerView />);

    expect(screen.getByRole('combobox', { name: 'Grip' })).toHaveTextContent('Traditional (right)');
    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute(
      'data-grip',
      'traditional'
    );
  });

  it('opens the grip guide on the grip the drummer plays', async () => {
    stubWebGL(true);
    localStorage.setItem('bb.drummerGrip', JSON.stringify('traditionalBoth'));
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'How to hold' }));
    const dialog = await screen.findByRole('dialog', { name: 'How to hold the sticks' });
    // traditional in both hands is taught as traditional
    expect(
      within(dialog).getByRole('tab', { name: 'Traditional', selected: true })
    ).toBeInTheDocument();
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

  it('shows the corner chart by default, and turns it off and remembers that', async () => {
    stubWebGL(true);
    const funk = testStyle('funk');
    const A = generatePattern({
      style: funk,
      meter: '4/4',
      seed: 7,
      bars: 1,
      density: 50,
      ghosts: 50,
    });
    fakeStudio = { ...fakeStudio, view: { A, B: null } };
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    const { container } = render(<DrummerView />);

    const toggle = screen.getByRole('button', { name: 'Chart' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.drummer-chart')).not.toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.drummer-chart')).toBeNull();
    expect(JSON.parse(localStorage.getItem('bb.drummerChart') ?? 'null')).toBe(false);
  });

  /** The window as wide as `px`, as the chart's media query reads it. */
  function stubWidth(px: number) {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: px >= Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  }

  const oneBar = () =>
    generatePattern({
      style: testStyle('funk'),
      meter: '4/4',
      seed: 7,
      bars: 1,
      density: 50,
      ghosts: 50,
    });

  it('moves the drummer aside for the chart on a wide screen', async () => {
    stubWebGL(true);
    stubWidth(1200);
    fakeStudio = { ...fakeStudio, view: { A: oneBar(), B: null } };
    const DrummerView = await loadDrummerView();
    const { container } = render(<DrummerView />);
    expect(container.querySelector('.drummer-chart')).not.toBeNull();
    expect(capturedCanvasProps?.aside).toBe(true);
    vi.unstubAllGlobals();
  });

  it('neither mounts the chart nor moves the drummer on a phone, where the chart is hidden', async () => {
    stubWebGL(true);
    stubWidth(400);
    fakeStudio = { ...fakeStudio, view: { A: oneBar(), B: null } };
    const DrummerView = await loadDrummerView();
    const { container } = render(<DrummerView />);
    expect(container.querySelector('.drummer-chart')).toBeNull();
    expect(capturedCanvasProps?.aside).toBe(false);
    vi.unstubAllGlobals();
  });

  it('leaves the drummer in the middle when there is no section for the chart to draw', async () => {
    stubWebGL(true);
    stubWidth(1200);
    const DrummerView = await loadDrummerView();
    render(<DrummerView />);
    expect(capturedCanvasProps?.aside).toBe(false);
    vi.unstubAllGlobals();
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
