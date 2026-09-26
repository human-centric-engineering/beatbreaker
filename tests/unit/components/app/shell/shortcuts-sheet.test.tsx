// @vitest-environment happy-dom

/**
 * `ShortcutsSheet` on its own: it draws the table the key handler reads, row
 * for row, and closes through its own dialog. Opening it with `?` from the
 * Studio is in `studio-shortcuts.test.tsx`.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SHORTCUTS } from '@/components/app/shell/shortcuts';
import { ShortcutsSheet } from '@/components/app/shell/shortcuts-sheet';

describe('ShortcutsSheet', () => {
  it('draws nothing while closed', () => {
    render(<ShortcutsSheet open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists each shortcut with what it does, in table order', () => {
    render(<ShortcutsSheet open onOpenChange={() => {}} />);
    const sheet = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    const rows = within(sheet).getAllByRole('row');
    expect(
      rows.map((r) => [r.querySelector('th')?.textContent, r.querySelector('td')?.textContent])
    ).toEqual(SHORTCUTS.map((s) => [s.keys, s.does]));
  });

  it('asks to close on Escape', async () => {
    const onOpenChange = vi.fn();
    render(<ShortcutsSheet open onOpenChange={onOpenChange} />);
    await userEvent.setup().keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
