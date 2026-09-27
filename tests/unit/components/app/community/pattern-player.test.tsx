// @vitest-environment happy-dom

/**
 * `PatternPlayer` — the read-only player on `/p/[slug]` (Phase 6, task 6.6):
 * play, tempo and layer over the Studio's real transport and audio engine,
 * without the editor. No `AudioContext` is stubbed here on purpose: happy-dom
 * has none, and the "cannot play audio" branch is exactly what that exercises.
 *
 * @see components/app/community/pattern-player.tsx
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PatternPlayer } from '@/components/app/community/pattern-player';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testKits, testStyle } from '@/tests/helpers/catalogue';

function payload() {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 4,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return breakPayload({
    bpm: 96,
    swing: 10,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

describe('PatternPlayer', () => {
  it('renders the play button, tempo and layer controls', () => {
    render(<PatternPlayer payload={payload()} kits={testKits()} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument();
    // Exact match: a /layer/i regex also matches the group's
    // aria-label="Player" ("Player" contains "layer" case-insensitively).
    expect(screen.getByLabelText('Layer')).toBeInTheDocument();
  });

  it('shows the "cannot play audio" status when Web Audio is unavailable, and does not flip to Stop', async () => {
    expect(window.AudioContext).toBeUndefined();
    const user = userEvent.setup();
    render(<PatternPlayer payload={payload()} kits={testKits()} />);

    await user.click(screen.getByRole('button', { name: /play/i }));

    expect(screen.getByText(/this browser cannot play audio here/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^stop$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('updates the tempo label when the tempo slider changes', () => {
    render(<PatternPlayer payload={payload()} kits={testKits()} />);
    const slider = screen.getByLabelText(/tempo: 96 bpm/i);
    // user-event's `type`/`clear` don't drive range inputs; a direct change
    // event is the realistic way a slider reports a new value to React.
    fireEvent.change(slider, { target: { value: '120' } });
    expect(screen.getByText('Tempo: 120 bpm')).toBeInTheDocument();
    expect(screen.queryByLabelText(/tempo: 96 bpm/i)).toBeNull();
  });

  it('updates the layer label when a different layer is selected', async () => {
    const user = userEvent.setup();
    render(<PatternPlayer payload={payload()} kits={testKits()} />);
    const select = screen.getByLabelText<HTMLSelectElement>('Layer');
    expect(select.value).toBe('5');
    await user.selectOptions(select, '2');
    expect(select.value).toBe('2');
    expect(select.selectedOptions[0].textContent).toMatch(/^2 ·/);
  });
});
