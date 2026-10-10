// @vitest-environment happy-dom

/**
 * The style picker, on its own: the sleeve names the style on the stage; the
 * crate opens on it, narrows as you type, moves with the arrows, picks with
 * Enter or a click and closes with Escape. A second section is a tab.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StylePicker } from '@/components/app/studio/style-picker';
import type { PickerSection } from '@/lib/app/breaks/catalogue/picker';

function entry(key: string, label: string, group: string) {
  return {
    key,
    label,
    group,
    blurb: `${label} in a line.`,
    meta: ['4/4', '90–120 bpm', 'straight'],
    haystack: `${label} ${group}`.toLowerCase(),
  };
}

const STYLES: PickerSection = {
  id: 'styles',
  label: 'Styles',
  noun: 'style',
  searchHint: 'shuffle, 12/8',
  groups: [
    ['Funk', [entry('funk', 'Funk 16ths', 'Funk'), entry('boombap', 'Boom bap', 'Funk')]],
    ['Jazz', [entry('swing', 'Medium swing', 'Jazz'), entry('bebop', 'Bebop', 'Jazz')]],
  ],
};
const DRUMMERS: PickerSection = {
  id: 'drummers',
  label: 'Drummers',
  noun: 'drummer',
  searchHint: 'Bonham',
  groups: [['The sixties', [entry('mitch', 'Mitch Mitchell', 'The sixties')]]],
};

function setup(sections = [STYLES], value = 'boombap') {
  const onPick = vi.fn();
  const user = userEvent.setup();
  render(<StylePicker id="pick" sections={sections} value={value} onPick={onPick} />);
  return { onPick, user };
}

const card = (name: string) =>
  within(screen.getByRole('listbox')).getByRole('option', { name: new RegExp(`^${name}`) });

describe('StylePicker', () => {
  it('names the style on the stage on the sleeve, with its group and facts', () => {
    setup();
    const sleeve = screen.getByRole('button', { name: 'Style: Boom bap' });
    expect(sleeve.textContent).toContain('Funk · 4/4 · 90–120 bpm');
    expect(sleeve.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('opens on the style that is playing, tagged and highlighted, with the search focused', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    expect(screen.getByRole('heading', { name: 'Pick a style' })).toBeTruthy();
    const search = screen.getByRole('combobox', { name: 'Search the styles' });
    expect(document.activeElement).toBe(search);
    expect(card('Boom bap').getAttribute('aria-selected')).toBe('true');
    expect(within(card('Boom bap')).getByText('On the stage')).toBeTruthy();
    expect(search.getAttribute('aria-activedescendant')).toBe(card('Boom bap').id);
  });

  it('moves with the arrows across groups and picks with Enter', async () => {
    const { user, onPick } = setup();
    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    await user.keyboard('{ArrowDown}');
    expect(card('Medium swing').getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    // it stops at the first rather than wrapping
    expect(card('Funk 16ths').getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{PageDown}{Enter}');
    expect(onPick).toHaveBeenCalledWith('styles', 'bebop');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('narrows as you type, and the highlight lands on what is left', async () => {
    const { user, onPick } = setup();
    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    await user.type(screen.getByRole('combobox'), 'jazz bop');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.id)).toEqual([card('Bebop').id]);
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledWith('styles', 'bebop');
  });

  it('says so when nothing matches, and picks nothing on Enter', async () => {
    const { user, onPick } = setup();
    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText(/Nothing in the crate matches “zzz”/)).toBeTruthy();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onPick).not.toHaveBeenCalled();
  });

  it('picks a card on a click, and on Enter from the card itself', async () => {
    const { user, onPick } = setup();
    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    await user.click(card('Medium swing'));
    expect(onPick).toHaveBeenLastCalledWith('styles', 'swing');

    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    card('Funk 16ths').focus();
    await user.keyboard(' ');
    expect(onPick).toHaveBeenLastCalledWith('styles', 'funk');
  });

  it('highlights what the pointer is over, and a divider jumps to its group', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    await user.hover(card('Funk 16ths'));
    expect(card('Funk 16ths').getAttribute('aria-selected')).toBe('true');
    const rail = within(screen.getByRole('navigation', { name: 'Groups' }));
    await user.click(rail.getByRole('button', { name: /^Jazz/ }));
    expect(card('Medium swing').getAttribute('aria-selected')).toBe('true');
    expect(rail.getByRole('button', { name: /^Jazz/ }).getAttribute('aria-current')).toBe('true');
  });

  it('closes on Escape without picking', async () => {
    const { user, onPick } = setup();
    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('shows a second section as a tab, and picks from it', async () => {
    const { user, onPick } = setup([STYLES, DRUMMERS]);
    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    expect(screen.getByRole('tab', { name: /Styles/ }).getAttribute('aria-selected')).toBe('true');
    await user.click(screen.getByRole('tab', { name: /Drummers/ }));
    expect(screen.getByRole('heading', { name: 'Pick a drummer' })).toBeTruthy();
    await user.click(card('Mitch Mitchell'));
    expect(onPick).toHaveBeenCalledWith('drummers', 'mitch');
  });

  it('is named by the label beside it, then by the style', () => {
    render(
      <>
        <span id="lab">Style</span>
        <StylePicker labelId="lab" sections={[STYLES]} value="swing" onPick={vi.fn()} />
      </>
    );
    expect(screen.getByRole('button', { name: 'Style Medium swing' })).toBeTruthy();
    expect(screen.getByLabelText(/^Style/)).toBe(screen.getByRole('button'));
  });

  it('clears a search on the first Escape, and closes on the next', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /^Style:/ }));
    const search = screen.getByRole<HTMLInputElement>('combobox');
    await user.type(search, 'bop');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(search.value).toBe('');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names a key it cannot find as it is', () => {
    setup([STYLES], 'gone');
    expect(screen.getByRole('button', { name: 'Style: gone' }).textContent).toContain(
      'Pick a style'
    );
  });
});
