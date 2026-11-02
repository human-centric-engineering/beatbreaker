// @vitest-environment happy-dom

/**
 * `MeterField`, the Studio's time signature (16-b-iii, D83): the named meters
 * in a menu, and Another… to build any other from its beats, its beat value
 * and its grid.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MeterField } from '@/components/app/studio/meter-field';

function Field({ start, onChange }: { start: string; onChange?: (key: string) => void }) {
  const [meter, setMeter] = useState(start);
  return (
    <>
      <label htmlFor="bb-meter">Time signature</label>
      <MeterField
        value={meter}
        onChange={(key) => {
          setMeter(key);
          onChange?.(key);
        }}
      />
      {/* a meter that arrives from elsewhere: a pattern loaded */}
      <button type="button" onClick={() => setMeter('4/4')}>
        Load 4/4
      </button>
      <output data-testid="meter">{meter}</output>
    </>
  );
}

const menu = () => screen.getByRole('combobox', { name: 'Time signature' });

async function choose(name: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name }));
  await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: option }));
}

function setBeats(n: number) {
  const beats = screen.getByRole('spinbutton', { name: 'Beats' });
  fireEvent.change(beats, { target: { value: String(n) } });
  fireEvent.blur(beats);
}

describe('MeterField', () => {
  it('shows a named meter in the menu, with the builder put away', () => {
    render(<Field start="7/8" />);
    expect(menu()).toHaveTextContent('7/8');
    expect(screen.queryByRole('spinbutton', { name: 'Beats' })).toBeNull();
  });

  it('chooses a named meter from the menu', async () => {
    const onChange = vi.fn();
    render(<Field start="4/4" onChange={onChange} />);
    await choose('Time signature', '12/8');
    expect(onChange).toHaveBeenCalledWith('12/8');
  });

  it('opens the builder on Another…, and builds 13/8 from its beats and beat value', async () => {
    const onChange = vi.fn();
    render(<Field start="4/4" onChange={onChange} />);
    await choose('Time signature', 'Another…');
    expect(menu()).toHaveTextContent('Another…');
    // choosing Another… writes nothing until the meter changes
    expect(onChange).not.toHaveBeenCalled();
    setBeats(13);
    expect(onChange).toHaveBeenLastCalledWith('13/4');
    await choose('Beat value', '8');
    expect(onChange).toHaveBeenLastCalledWith('13/8');
    expect(screen.getByTestId('meter')).toHaveTextContent('13/8');
  });

  it('puts a bar of 7/4 in 32nds, and drops a grid that is the default', async () => {
    const onChange = vi.fn();
    render(<Field start="7/4" onChange={onChange} />);
    await choose('Time signature', 'Another…');
    await choose('Grid', '32nds');
    expect(onChange).toHaveBeenLastCalledWith('7/4-32');
    await choose('Grid', 'Sixteenths');
    expect(onChange).toHaveBeenLastCalledWith('7/4');
    // a named meter the builder wrote keeps the builder open
    expect(screen.getByRole('spinbutton', { name: 'Beats' })).toBeInTheDocument();
  });

  it('opens on the builder for a meter without a name', () => {
    render(<Field start="17/16" />);
    expect(menu()).toHaveTextContent('Another…');
    expect(screen.getByRole('spinbutton', { name: 'Beats' })).toHaveValue(17);
    expect(screen.getByRole('combobox', { name: 'Beat value' })).toHaveTextContent('16');
  });

  it('says why, and writes nothing, when the grid cannot hold the bar', async () => {
    const onChange = vi.fn();
    render(<Field start="13/8" onChange={onChange} />);
    await choose('Grid', 'Sextuplets');
    expect(screen.getByRole('alert')).toHaveTextContent(
      '13/8 in sextuplets is not a bar the grid can hold.'
    );
    expect(onChange).not.toHaveBeenCalled();
    // a meter that works clears it
    await choose('Grid', '32nds');
    expect(onChange).toHaveBeenLastCalledWith('13/8-32');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a named meter that arrives from elsewhere in the menu, with the builder put away', async () => {
    render(<Field start="13/8" />);
    expect(menu()).toHaveTextContent('Another…');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Load 4/4' }));
    expect(menu()).toHaveTextContent('4/4');
    expect(screen.queryByRole('spinbutton', { name: 'Beats' })).toBeNull();
  });

  it('holds the beats to one to 64', () => {
    const onChange = vi.fn();
    render(<Field start="13/8" onChange={onChange} />);
    setBeats(99);
    expect(onChange).toHaveBeenLastCalledWith('64/8');
  });
});
