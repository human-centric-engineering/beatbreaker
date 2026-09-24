// @vitest-environment happy-dom

/**
 * "Save your changes?" on its own — what it says, and which answer each button
 * gives. When it opens, and what each answer then does to the Studio, is
 * `studio-document.test.tsx`; this is the dialog's side of that contract,
 * driven through a stub of the Studio's state.
 *
 * @see components/app/studio/leave-dialog.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const studio = vi.hoisted(() => ({
  leaving: null as { title: string } | null,
  resolveLeave: vi.fn(async () => {}),
  doc: { mine: true, status: 'offline' },
}));
vi.mock('@/components/app/studio/studio-provider', () => ({ useStudio: () => studio }));

import { LeaveDialog } from '@/components/app/studio/leave-dialog';

beforeEach(() => {
  studio.leaving = { title: 'Cold Carpet' };
  studio.doc = { mine: true, status: 'offline' };
  studio.resolveLeave.mockClear();
});

describe('LeaveDialog', () => {
  it('is closed when nothing is waiting to replace the pattern', () => {
    studio.leaving = null;
    render(<LeaveDialog />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('names the pattern, and says your own edits have not reached your account', () => {
    render(<LeaveDialog />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toContain('Save your changes to “Cold Carpet”?');
    expect(dialog.textContent).toContain('They have not reached your account yet.');
  });

  it('says saving someone else’s pattern keeps a copy', () => {
    studio.doc = { mine: false, status: 'scratch' };
    render(<LeaveDialog />);
    expect(screen.getByRole('alertdialog').textContent).toContain(
      'Saving keeps a copy of it, with your changes, in your account.'
    );
  });

  it('calls a pattern with no name what the API will call it', () => {
    studio.leaving = { title: '' };
    render(<LeaveDialog />);
    expect(screen.getByRole('alertdialog').textContent).toContain('“Untitled pattern”');
  });

  it.each([
    ['Save', 'save'],
    ['Don’t save', 'discard'],
    ['Cancel', 'cancel'],
  ])('%s answers %s', async (label, choice) => {
    const user = userEvent.setup();
    render(<LeaveDialog />);
    await user.click(screen.getByRole('button', { name: label }));
    expect(studio.resolveLeave).toHaveBeenCalledWith(choice);
  });

  it('will not take a second Save while one is on its way', () => {
    studio.doc = { mine: true, status: 'saving' };
    render(<LeaveDialog />);
    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);
  });
});
