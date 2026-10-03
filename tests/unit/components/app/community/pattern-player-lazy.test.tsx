// @vitest-environment happy-dom

/**
 * `/p/`'s player keeps the audio engine out of the page's first bundle
 * (Phase 8, task 8.5).
 *
 * The engine module is mocked behind a gate this file opens, and the mock
 * counts how often it is evaluated. Importing the player and rendering it
 * must not evaluate the engine. Once the gate opens, it loads once. A Play
 * pressed before that is ignored, rather than started late outside the
 * gesture, which iOS would keep silent.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const lazy = vi.hoisted(() => {
  let open: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  const made: unknown[] = [];
  class FakeAudio {
    ctx = null;
    samples: unknown = null;
    percussion: unknown = null;
    setKit = vi.fn();
    close = vi.fn();
    init = vi.fn(() => null);
    resume = vi.fn();
    constructor() {
      made.push(this);
    }
  }
  return { gate, open: () => open(), evaluated: { engine: 0 }, made, FakeAudio };
});

vi.mock('@/lib/app/breaks/audio/engine', async () => {
  lazy.evaluated.engine += 1;
  await lazy.gate;
  return { BreakAudio: lazy.FakeAudio, SourceStack: class {} };
});
vi.mock('@/lib/app/breaks/audio/packs', () => ({ PackSource: class {} }));

import { PatternPlayer } from '@/components/app/community/pattern-player';
import { breakPayload } from '@/lib/app/breaks/share';
import { generatePattern } from '@/lib/app/breaks/generate';
import { testKits, testStyle } from '@/tests/helpers/catalogue';

function payload() {
  const A = generatePattern({
    style: testStyle('funk'),
    meter: '4/4',
    seed: 4,
    bars: 1,
    density: 50,
    ghosts: 50,
  });
  return breakPayload({ bpm: 96, swing: 0, level: 5, arrangement: ['A'], A, B: A });
}

describe('PatternPlayer — the engine loads after the first render', () => {
  it('does not load the engine to import or render the player; loads it once afterwards; ignores an early Play', async () => {
    expect(lazy.evaluated.engine).toBe(0);

    render(<PatternPlayer payload={payload()} kits={testKits()} />);

    // Rendered and interactive, with no engine yet.
    expect(lazy.made).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument();
    expect(screen.queryByText(/cannot play audio/i)).toBeNull();

    lazy.open();
    await waitFor(() => expect(lazy.made).toHaveLength(1));
    expect(lazy.evaluated.engine).toBe(1);
  });
});
