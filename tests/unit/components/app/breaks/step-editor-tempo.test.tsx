// @vitest-environment happy-dom

/**
 * `StepEditor`'s Tempo row (16-b-ii, D82): a cell a bar that says where the
 * section steps to a new tempo or speeds up or slows down, and a picker that
 * writes a bar's point in beats a minute, kept as a ratio of the section's
 * tempo.
 *
 * @see components/app/breaks/step-editor.tsx
 * @see components/app/breaks/tempo-picker.tsx
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StepEditor } from '@/components/app/breaks/step-editor';
import { generatePattern } from '@/lib/app/breaks/generate';
import type { TempoPoint } from '@/lib/app/breaks/tempo-map';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

function pattern(tempo?: TempoPoint[]): Pattern {
  const p = generatePattern({
    style: testStyle('funk'),
    meter: '4/4',
    seed: 7,
    bars: 4,
    density: 50,
    ghosts: 50,
  });
  return tempo ? { ...p, tempo } : p;
}

function mount(pat: Pattern, onSet = vi.fn(() => null as string | null), withRow = true) {
  render(
    <StepEditor
      view={pat}
      stored={pat}
      cursor={null}
      onCycle={vi.fn()}
      onSet={vi.fn()}
      section="A"
      tempo={withRow ? { bpm: 120, onSet } : undefined}
    />
  );
  return onSet;
}

const cellFor = (bar: number) =>
  screen.getByRole('button', { name: new RegExp(`^Tempo, bar ${bar}:`) });

describe('the Tempo row', () => {
  it('is not drawn without a tempo to read it by', () => {
    mount(pattern(), vi.fn(), false);
    expect(screen.queryByText('Tempo')).toBeNull();
  });

  it('says each bar’s point in bpm at the section’s tempo, and marks the bars a ramp runs through', () => {
    mount(pattern([{ bar: 1, ratio: 1, to: 0.5 }]));
    expect(cellFor(1).textContent).toBe('');
    expect(cellFor(2).textContent).toBe('120→60');
    expect(cellFor(2).className).toContain('written');
    expect(cellFor(3).textContent).toBe('→');
    expect(cellFor(4).getAttribute('aria-label')).toBe('Tempo, bar 4: inside a change of tempo');
  });

  it('writes a held tempo as a ratio of the section’s', () => {
    const onSet = mount(pattern());
    fireEvent.click(cellFor(3));
    const from = screen.getByRole<HTMLInputElement>('spinbutton');
    expect(from.value).toBe('120');
    fireEvent.change(from, { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(onSet).toHaveBeenCalledWith(2, { ratio: 1.25 });
    // set, so the picker closes
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('writes a ramp with the tempo it gets to', () => {
    const onSet = mount(pattern());
    fireEvent.click(cellFor(1));
    fireEvent.click(screen.getByRole('checkbox'));
    const [, to] = screen.getAllByRole('spinbutton');
    fireEvent.change(to, { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(onSet).toHaveBeenCalledWith(0, { ratio: 1, to: 0.5 });
  });

  it('opens on the bar’s own point, and takes it away', () => {
    const onSet = mount(pattern([{ bar: 1, ratio: 1.25 }]));
    fireEvent.click(cellFor(2));
    expect(screen.getByRole<HTMLInputElement>('spinbutton').value).toBe('150');
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onSet).toHaveBeenCalledWith(1, null);
  });

  it('starts a new point at the tempo the bar already plays at', () => {
    mount(pattern([{ bar: 0, ratio: 1.5 }]));
    fireEvent.click(cellFor(3));
    expect(screen.getByRole<HTMLInputElement>('spinbutton').value).toBe('180');
  });

  it('says why a point was refused, and stays open', () => {
    const onSet = mount(
      pattern(),
      vi.fn(() => 'A break’s sections play within ×4 of each other')
    );
    fireEvent.click(cellFor(1));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(onSet).toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/within ×4/);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('refuses a tempo that is not a number before asking', () => {
    const onSet = mount(pattern());
    fireEvent.click(cellFor(1));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(onSet).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/beats a minute/);
  });

  it('closes on Escape', () => {
    mount(pattern());
    fireEvent.click(cellFor(1));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
