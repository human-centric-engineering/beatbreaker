// @vitest-environment happy-dom

/**
 * `/p/`'s player when the audio engine fails to load (Phase 8, task 8.5).
 *
 * The engine is imported after the first render, so a tab left open across
 * a deploy can ask for a chunk that no longer exists. Play then says the
 * browser cannot play here, rather than doing nothing.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/audio/engine', () => {
  throw new Error('Failed to fetch dynamically imported module');
});
vi.mock('@/lib/app/breaks/audio/packs', () => ({ PackSource: class {} }));
vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { PatternPlayer } from '@/components/app/community/pattern-player';
import { breakPayload } from '@/lib/app/breaks/share';
import { generatePattern } from '@/lib/app/breaks/generate';
import { logger } from '@/lib/logging';
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

describe('PatternPlayer — the engine fails to load', () => {
  it('logs the failure, and Play then shows the cannot-play message', async () => {
    render(<PatternPlayer payload={payload()} kits={testKits()} />);

    await waitFor(() =>
      expect(logger.warn).toHaveBeenCalledWith(
        'BeatBreaker: the audio engine did not load — the chart still reads',
        expect.objectContaining({ error: expect.any(String) })
      )
    );
    expect(screen.queryByText(/cannot play audio/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'This browser cannot play audio here — the chart still reads.'
    );
  });
});
