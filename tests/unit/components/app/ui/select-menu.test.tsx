// @vitest-environment happy-dom

/**
 * `SelectMenu`, the app's dropdown in place of the browser's `<select>`: the
 * select-only combobox — what it shows, how a mouse and a keyboard choose,
 * that it submits with a form, and where its list goes.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SelectMenu, type SelectOption } from '@/components/app/ui/select-menu';

const METERS: SelectOption[] = [
  { value: '4/4', label: '4/4' },
  { value: '3/4', label: '3/4' },
  { value: '6/8', label: '6/8', disabled: true, note: 'not here' },
  { value: '7/8', label: '7/8' },
];

function Controlled({ onChange }: { onChange?: (v: string) => void }) {
  const [v, setV] = useState('4/4');
  return (
    <>
      <label htmlFor="m">Meter</label>
      <SelectMenu
        id="m"
        value={v}
        options={METERS}
        onValueChange={(next) => {
          setV(next);
          onChange?.(next);
        }}
      />
    </>
  );
}

const trigger = () => screen.getByRole('combobox', { name: 'Meter' });

describe('SelectMenu', () => {
  it('shows the chosen label, and its value reads off the trigger', () => {
    render(<Controlled />);
    expect(trigger()).toHaveTextContent('4/4');
    expect((trigger() as HTMLButtonElement).value).toBe('4/4');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens on a click with the chosen option lit, and chooses another', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(trigger());
    const list = screen.getByRole('listbox');
    expect(within(list).getByRole('option', { name: '4/4' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await user.click(within(list).getByRole('option', { name: '7/8' }));
    expect(onChange).toHaveBeenCalledWith('7/8');
    expect(trigger()).toHaveTextContent('7/8');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('will not choose a disabled option, and reads its note after its label', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(trigger());
    const off = screen.getByRole('option', { name: '6/8 — not here' });
    expect(off).toHaveAttribute('aria-disabled', 'true');
    await user.click(off);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves with the arrows past a disabled option, chooses on Enter and closes on Escape', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    trigger().focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    // opens on the chosen option, then steps 3/4, then over 6/8 to 7/8
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const active = trigger().getAttribute('aria-activedescendant');
    expect(document.getElementById(active!)).toHaveTextContent('7/8');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('7/8');
    expect(trigger()).toHaveFocus();

    await user.keyboard('{ArrowDown}{Home}{Escape}');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('chooses by typing while closed, as a select does', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <label htmlFor="k">Kit</label>
        <SelectMenu
          id="k"
          defaultValue="drs"
          onValueChange={onChange}
          options={[
            { value: 'drs', label: 'DRS kit' },
            { value: 'smdrums', label: 'SM Drums' },
            { value: 'bigrusty', label: 'Big Rusty' },
          ]}
        />
      </>
    );
    screen.getByRole('combobox', { name: 'Kit' }).focus();
    await user.keyboard('s');
    expect(onChange).toHaveBeenCalledWith('smdrums');
  });

  it('closes when the page is pressed anywhere else', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Controlled />
        <p>elsewhere</p>
      </>
    );
    await user.click(trigger());
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.pointerDown(screen.getByText('elsewhere'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('files options under their group headings', async () => {
    const user = userEvent.setup();
    render(
      <SelectMenu
        aria-label="Kit"
        defaultValue="a"
        groups={[
          { label: 'Synthesised', options: [{ value: 'a', label: 'A' }] },
          { label: 'Sampled Recordings', options: [{ value: 'b', label: 'B' }] },
        ]}
      />
    );
    await user.click(screen.getByRole('combobox', { name: 'Kit' }));
    const group = screen.getByRole('group', { name: 'Sampled Recordings' });
    expect(within(group).getByRole('option', { name: 'B' })).toBeTruthy();
  });

  it('submits its value with a form under its name', async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="filters">
        <SelectMenu
          aria-label="Sort"
          name="sort"
          defaultValue="newest"
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'saved', label: 'Most saved' },
          ]}
        />
      </form>
    );
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'filters' });
    expect(new FormData(form).get('sort')).toBe('newest');
    await user.click(screen.getByRole('combobox', { name: 'Sort' }));
    await user.click(screen.getByRole('option', { name: 'Most saved' }));
    expect(new FormData(form).get('sort')).toBe('saved');
  });

  it('opens its list inside the Studio’s theme, so it wears the Studio’s tokens', async () => {
    const user = userEvent.setup();
    render(
      <div className="bb" data-testid="studio">
        <Controlled />
      </div>
    );
    await user.click(trigger());
    expect(screen.getByTestId('studio').contains(screen.getByRole('listbox'))).toBe(true);
  });

  it('keeps Escape to itself, so the drawer around it stays open', async () => {
    const user = userEvent.setup();
    const drawer = vi.fn();
    document.addEventListener('keydown', drawer, true);
    try {
      render(<Controlled />);
      await user.click(trigger());
      await user.keyboard('{Escape}');
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(drawer).not.toHaveBeenCalled();
      // closed, Escape is the page's again
      await user.keyboard('{Escape}');
      expect(drawer).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('keydown', drawer, true);
    }
  });

  it('dims the placeholder as a class of its own, and opens upward near the bottom', async () => {
    const user = userEvent.setup();
    render(<SelectMenu aria-label="Shape" value="none" options={METERS} placeholder="Pick one" />);
    const plate = screen.getByRole('combobox', { name: 'Shape' });
    expect(plate.querySelector('.selm-value')).toHaveClass('selm-value', 'empty');
    plate.getBoundingClientRect = () => new DOMRect(0, window.innerHeight - 40, 200, 36);
    await user.click(plate);
    expect(screen.getByRole('listbox')).toHaveClass('selm-list', 'up');
  });
});
