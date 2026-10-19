// @vitest-environment happy-dom

/**
 * `DrummerView` — the 3D drummer as a player: its own controls (the camera
 * menu, and the drummer's settings: hand, grip, see-through, the scrolling
 * chart, shuffle), the picture-in-picture it becomes in the chart view, and
 * the gate that decides whether the canvas or a "no WebGL" message shows.
 *
 * The bar it puts them in is `PlayerBar`, tested in `studio-transport.test.tsx`;
 * here it is a stub that renders what it is handed, so the view's own tools
 * are what is under test.
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
import { LAPTOP, PHONE, stubWidth } from '@/tests/helpers/media';
import { openMenu, pickOption } from '@/tests/helpers/select-menu';

type User = ReturnType<typeof userEvent.setup>;

/** The drummer's settings are in a panel off the bar: open it. */
async function openSettings(user: User) {
  await user.click(screen.getByRole('button', { name: 'Drummer settings' }));
  return within(await screen.findByRole('dialog', { name: 'Drummer settings' }));
}

/** The camera is a menu off the bar: open it. */
async function openCamera(user: User) {
  await user.click(screen.getByRole('button', { name: 'Camera' }));
  return within(await screen.findByRole('menu'));
}

let fakeStudio: Studio;

vi.mock('@/components/app/studio/player/player-bar', () => ({
  PlayerBar: (p: { extra?: React.ReactNode; view?: React.ReactNode; hint?: React.ReactNode }) => (
    <div data-testid="player-bar">
      {p.hint}
      {p.extra}
      {p.view}
    </div>
  ),
}));

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
  stubWidth(LAPTOP);
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
  vi.unstubAllGlobals();
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

const oneBar = () =>
  generatePattern({
    style: testStyle('funk'),
    meter: '4/4',
    seed: 7,
    bars: 1,
    density: 50,
    ghosts: 50,
  });

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

    const settings = await openSettings(user);
    const hand = within(settings.getByRole('radiogroup', { name: 'Kit set up for' }));
    await user.click(hand.getByRole('radio', { name: 'Left-handed' }));

    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute('data-lefty', 'true');
    expect(JSON.parse(localStorage.getItem('bb.drummerHand') ?? 'null')).toBe('left');
  });

  it('makes every kit see-through on request, remembers it, and passes it to the canvas', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);
    await screen.findByTestId('drummer-canvas-stub');
    expect(capturedCanvasProps?.seeThrough).toBe(false);

    const settings = await openSettings(user);
    const toggle = settings.getByRole('button', { name: 'See-through kit' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(capturedCanvasProps?.seeThrough).toBe(true);
    expect(JSON.parse(localStorage.getItem('bb.drummerSeeThrough') ?? 'null')).toBe(true);
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

    const grip = (await openSettings(user)).getByRole('combobox', { name: 'Grip' });
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
    const user = userEvent.setup();
    render(<DrummerView />);

    const settings = await openSettings(user);
    expect(settings.getByRole('combobox', { name: 'Grip' })).toHaveTextContent(
      'Traditional (right)'
    );
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

    const settings = await openSettings(user);
    await user.click(settings.getByRole('button', { name: 'How to hold' }));
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

    await user.click((await openCamera(user)).getByRole('menuitemradio', { name: 'Side' }));

    let canvas = await screen.findByTestId('drummer-canvas-stub');
    expect(canvas).toHaveAttribute('data-view', 'side');
    expect(canvas).toHaveAttribute('data-view-seq', '1');
    // the camera's button says which shot it is on
    expect(screen.getByRole('button', { name: 'Camera' })).toHaveTextContent('Side');

    const camera = await openCamera(user);
    expect(camera.getByRole('menuitemradio', { name: 'Side' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await user.click(camera.getByRole('menuitemradio', { name: 'Hands' }));
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

    const toggle = (await openSettings(user)).getByRole('button', { name: 'Scrolling chart' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.drummer-chart')).not.toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.drummer-chart')).toBeNull();
    expect(JSON.parse(localStorage.getItem('bb.drummerChart') ?? 'null')).toBe(false);
  });

  it('moves the drummer aside for the chart on a wide screen', async () => {
    stubWebGL(true);
    stubWidth(LAPTOP);
    fakeStudio = { ...fakeStudio, view: { A: oneBar(), B: null } };
    const DrummerView = await loadDrummerView();
    const { container } = render(<DrummerView />);
    expect(container.querySelector('.drummer-chart')).not.toBeNull();
    expect(capturedCanvasProps?.aside).toBe(true);
  });

  it('neither mounts the chart nor moves the drummer on a phone, where the chart is hidden', async () => {
    stubWebGL(true);
    stubWidth(PHONE);
    fakeStudio = { ...fakeStudio, view: { A: oneBar(), B: null } };
    const DrummerView = await loadDrummerView();
    const { container } = render(<DrummerView />);
    expect(container.querySelector('.drummer-chart')).toBeNull();
    expect(capturedCanvasProps?.aside).toBe(false);
  });

  it('leaves the drummer in the middle when there is no section for the chart to draw', async () => {
    stubWebGL(true);
    stubWidth(LAPTOP);
    const DrummerView = await loadDrummerView();
    render(<DrummerView />);
    expect(capturedCanvasProps?.aside).toBe(false);
  });

  it('bumps viewSeq on Re-centre without changing the view', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);

    await user.click((await openCamera(user)).getByRole('menuitem', { name: 'Re-centre' }));

    const canvas = await screen.findByTestId('drummer-canvas-stub');
    expect(canvas).toHaveAttribute('data-view', 'front');
    expect(canvas).toHaveAttribute('data-view-seq', '1');

    await user.click((await openCamera(user)).getByRole('menuitem', { name: 'Re-centre' }));
    expect(await screen.findByTestId('drummer-canvas-stub')).toHaveAttribute('data-view-seq', '2');
  });

  it('bumps shuffleSeq on Shuffle drummer, and nothing else', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView />);
    await screen.findByTestId('drummer-canvas-stub');
    expect(capturedCanvasProps?.shuffleSeq).toBe(0);

    const settings = await openSettings(user);
    await user.click(settings.getByRole('button', { name: 'Shuffle drummer' }));
    expect(capturedCanvasProps?.shuffleSeq).toBe(1);
    expect(capturedCanvasProps?.viewSeq).toBe(0);

    await user.click(settings.getByRole('button', { name: 'Shuffle drummer' }));
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

describe('DrummerView, kept in the corner of the chart view', () => {
  it('is one button that makes the drummer the main view, with none of the controls', async () => {
    stubWebGL(true);
    fakeStudio = { ...fakeStudio, view: { A: oneBar(), B: null } };
    const onExpand = vi.fn();
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    const { container } = render(<DrummerView pip onExpand={onExpand} />);

    await screen.findByTestId('drummer-canvas-stub');
    // no bar, no camera, no settings — and the corner chart is the chart view's own
    expect(screen.queryByTestId('player-bar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Camera' })).toBeNull();
    expect(container.querySelector('.drummer-chart')).toBeNull();
    expect(capturedCanvasProps?.aside).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Watch the drummer' }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('can be made smaller, and back', async () => {
    stubWebGL(true);
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    const { container } = render(<DrummerView pip />);
    const player = () => container.querySelector('.player');

    expect(player()).toHaveClass('is-pip');
    expect(player()).not.toHaveClass('is-small');
    await user.click(screen.getByRole('button', { name: 'Smaller drummer' }));
    expect(player()).toHaveClass('is-small');
    await user.click(screen.getByRole('button', { name: 'Larger drummer' }));
    expect(player()).not.toHaveClass('is-small');
  });
});

describe('DrummerView, as the main view', () => {
  it('puts its tools in the bar, and Chart view hands the stage back to the chart', async () => {
    stubWebGL(true);
    const onChart = vi.fn();
    const DrummerView = await loadDrummerView();
    const user = userEvent.setup();
    render(<DrummerView onChart={onChart} />);

    const bar = within(screen.getByTestId('player-bar'));
    expect(bar.getByRole('button', { name: 'Camera' })).toBeInTheDocument();
    expect(bar.getByRole('button', { name: 'Drummer settings' })).toBeInTheDocument();
    await user.click(bar.getByRole('button', { name: 'Chart view' }));
    expect(onChart).toHaveBeenCalledTimes(1);
  });

  it('keeps only its own tools on a phone, whose transport is in the footer', async () => {
    stubWebGL(true);
    stubWidth(PHONE);
    const DrummerView = await loadDrummerView();
    const { container } = render(<DrummerView />);

    await screen.findByTestId('drummer-canvas-stub');
    expect(screen.queryByTestId('player-bar')).toBeNull();
    const tools = container.querySelector('.player-phone-tools');
    expect(tools).not.toBeNull();
    expect(
      within(tools as HTMLElement).getByRole('button', { name: 'Drummer settings' })
    ).toBeInTheDocument();
    // the cue is still there to say what Play does
    expect(screen.getByText(/Press Play/)).toBeInTheDocument();
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
    // the chart still plays — the drummer's own tools are unaffected
    expect(screen.getByRole('button', { name: 'Drummer settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Camera' })).toBeInTheDocument();
  });
});
