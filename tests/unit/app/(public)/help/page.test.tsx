// @vitest-environment happy-dom

/**
 * `/help` (task 8.7): the shortcuts, a line per drawer, the iPhone note, the
 * corrections route, and _Show the tour again_.
 *
 * The shortcuts come from the table the key handler walks and the drawers
 * from the titles the drawer is built with, so the tests compare against those
 * tables rather than against copied strings — a key added to the Studio is
 * on this page with no edit here.
 *
 * @see app/(public)/help/page.tsx
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import HelpPage from '@/app/(public)/help/page';
import { DRAWERS } from '@/components/app/shell/drawer-guide';
import { SHORTCUTS } from '@/components/app/shell/shortcuts';
import { ShortcutsSheet } from '@/components/app/shell/shortcuts-sheet';
import { STUDIO_TOOLS } from '@/components/app/shell/studio-address';
import { TOUR_SEEN } from '@/lib/app/breaks/browser-keys';

const rowsOf = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .map((r) => [r.querySelector('th')?.textContent, r.querySelector('td')?.textContent]);

beforeEach(() => localStorage.clear());

describe('/help', () => {
  it('lists every binding in the shortcuts table, in order', () => {
    render(<HelpPage />);
    const section = screen.getByRole('region', { name: 'Keyboard shortcuts' });
    expect(rowsOf(within(section).getByRole('table'))).toEqual(
      SHORTCUTS.map((s) => [s.keys, s.does])
    );
  });

  it('lists the same rows as the ? sheet', () => {
    const { unmount } = render(<ShortcutsSheet open onOpenChange={() => {}} />);
    const sheet = rowsOf(within(screen.getByRole('dialog')).getByRole('table'));
    unmount();
    render(<HelpPage />);
    expect(rowsOf(screen.getByRole('table'))).toEqual(sheet);
  });

  it('has one line for each drawer, under the drawer’s own title', () => {
    render(<HelpPage />);
    const section = screen.getByRole('region', { name: 'The drawers' });
    const terms = within(section)
      .getAllByRole('term')
      .map((t) => t.textContent);
    expect(terms).toEqual(STUDIO_TOOLS.map((t) => DRAWERS[t].title));
    for (const tool of STUDIO_TOOLS) {
      expect(within(section).getByText(DRAWERS[tool].help)).toBeInTheDocument();
    }
  });

  it('says what the iPhone silent switch does', () => {
    render(<HelpPage />);
    const section = screen.getByRole('region', { name: 'No sound on an iPhone or iPad' });
    expect(section).toHaveTextContent(/silent switch mutes the Studio/);
  });

  it('gives the contact route for corrections to the famous breaks', () => {
    render(<HelpPage />);
    const section = screen.getByRole('region', { name: 'The famous breaks' });
    expect(within(section).getByRole('link', { name: /contact form/ })).toHaveAttribute(
      'href',
      '/contact'
    );
  });

  it('Show the tour again forgets the tour and goes to the Studio', async () => {
    localStorage.setItem(TOUR_SEEN.key, 'true');
    render(<HelpPage />);
    const link = screen.getByRole('link', { name: 'Show the tour again' });
    expect(link).toHaveAttribute('href', '/studio');
    await userEvent.setup().click(link);
    expect(localStorage.getItem(TOUR_SEEN.key)).toBeNull();
  });
});

describe('the ? sheet', () => {
  it('links to /help', () => {
    render(<ShortcutsSheet open onOpenChange={() => {}} />);
    expect(screen.getByRole('link', { name: 'Help page' })).toHaveAttribute('href', '/help');
  });
});
