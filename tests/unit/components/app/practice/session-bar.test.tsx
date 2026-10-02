// @vitest-environment happy-dom

/**
 * The practice session's bar above the stage (Phase 7D, tasks 7D.9–7D.10).
 *
 * The bar decides nothing: it draws the runner's state and calls the run's
 * controls. So `useStudio()` is replaced with a `sessionRun` built from the
 * real runner and real slot plans, and what is pinned is what the bar reads
 * from them.
 *
 * @see components/app/practice/session-bar.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionRun } from '@/components/app/practice/use-session-run';

let sessionRun: SessionRun | null = null;
vi.mock('@/components/app/studio/studio-provider', () => ({
  useStudio: () => ({ sessionRun }),
}));

import { clock, SessionBar } from '@/components/app/practice/session-bar';
import { slotPlan } from '@/lib/app/practice/climb';
import { boundary, downbeat, loaded, pause, startRun, stop } from '@/lib/app/practice/runner';
import { sessionView } from '@/tests/unit/components/app/practice/fixtures';

const steady = { startPct: 20, climbPct: 50, climbShape: 'steady' as const, climbSteps: 4 };
const items = [
  { title: 'Cold Carpet', level: 2, plan: slotPlan(1, 100, steady) },
  { title: 'Funky Drummer', level: 5, plan: slotPlan(1, 120, steady) },
];

function withRun(over: Partial<SessionRun>): SessionRun {
  return {
    session: sessionView({ name: 'Warm-up', totalMinutes: 2 }),
    run: null,
    items,
    now: 0,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    skip: vi.fn(),
    addMinute: vi.fn(),
    stop: vi.fn(),
    prompt: null,
    record: vi.fn(async () => {}),
    dismissPrompt: vi.fn(),
    ...over,
  };
}

/** The first slot, 20 seconds into a 30-second climb: 93 on its way to 100. */
function twentyIn() {
  return boundary(downbeat(loaded(startRun(items)), 10), items, 30);
}

beforeEach(() => {
  sessionRun = null;
});

describe('SessionBar', () => {
  it('draws nothing outside a session', () => {
    const { container } = render(<SessionBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers Start before the run, with what is in the session', async () => {
    sessionRun = withRun({});
    const user = userEvent.setup();
    render(<SessionBar />);
    expect(screen.getByText('2 patterns · 2 min')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(sessionRun.start).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Edit session' }).getAttribute('href')).toBe(
      `/practice/${sessionRun.session.id}`
    );
  });

  it('reads the runner: which pattern, the time left, and the tempo now and its target', () => {
    sessionRun = withRun({ run: twentyIn(), now: 30 });
    render(<SessionBar />);
    expect(screen.getByText(/Pattern 1 of 2 · Cold Carpet/)).toBeInTheDocument();
    expect(screen.getByLabelText('Time left in this pattern')).toHaveTextContent('0:40');
    expect(screen.getByLabelText('Tempo now and target')).toHaveTextContent('93 → 100 bpm');
  });

  it('says Count-in until the slot’s clock starts', () => {
    sessionRun = withRun({ run: loaded(startRun(items)), now: 5 });
    render(<SessionBar />);
    expect(screen.getByLabelText('Time left in this pattern')).toHaveTextContent('Count-in');
    expect(screen.getByLabelText('Tempo now and target')).toHaveTextContent('80 → 100 bpm');
  });

  it('calls the run’s controls', async () => {
    sessionRun = withRun({ run: twentyIn(), now: 30 });
    const user = userEvent.setup();
    render(<SessionBar />);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('button', { name: '+1 min' }));
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(sessionRun.pause).toHaveBeenCalled();
    expect(sessionRun.skip).toHaveBeenCalled();
    expect(sessionRun.addMinute).toHaveBeenCalled();
    expect(sessionRun.stop).toHaveBeenCalled();
  });

  it('offers Resume while paused, with the clock stopped where it was', async () => {
    sessionRun = withRun({ run: pause(twentyIn(), 35), now: 500 });
    const user = userEvent.setup();
    render(<SessionBar />);
    expect(screen.getByLabelText('Time left in this pattern')).toHaveTextContent('0:35');
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    expect(sessionRun.resume).toHaveBeenCalled();
  });

  it('offers to record a slot at the tempo it reached', async () => {
    sessionRun = withRun({
      run: twentyIn(),
      prompt: {
        result: {
          index: 0,
          title: 'Cold Carpet',
          level: 2,
          targetBpm: 100,
          reachedBpm: 100,
          seconds: 60,
          ended: 'time',
        },
        target: { breakId: 'cbrk00000000000000000001' },
      },
    });
    const user = userEvent.setup();
    render(<SessionBar />);
    expect(screen.getByText('Played “Cold Carpet” well at 100?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record it' }));
    expect(sessionRun.record).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(sessionRun.dismissPrompt).toHaveBeenCalled();
  });

  it('says what was played once it is done, and offers it again', () => {
    sessionRun = withRun({ run: stop(twentyIn(), items, 40) });
    render(<SessionBar />);
    expect(screen.getByText('Done — 1 pattern played')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run it again' })).toBeInTheDocument();
  });
});

describe('clock', () => {
  it('shows minutes and seconds, rounding up, never below zero', () => {
    expect(clock(61.2)).toBe('1:02');
    expect(clock(9)).toBe('0:09');
    expect(clock(-3)).toBe('0:00');
  });
});
