// @vitest-environment happy-dom

/**
 * The Stage, mounted on its own.
 *
 * `tests/unit/components/app/shell/studio-frame.test.tsx` already proves the
 * whole Studio assembles — generation, engraving, the layer reduction — and
 * covers the view-mode default, L1 vs the full break, and the preview button
 * at its two edges (enabled+faint at a mid layer, disabled at L5). This file
 * does not repeat any of that: it mounts `<Stage/>` by itself and reaches the
 * branches the frame test's journeys never touch — the view-mode buttons
 * themselves, an intermediate layer, the chart-tool toggles, the size slider,
 * the arrangement controls, and the step editor's own show/hide and
 * edit-which-section toggles.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GeneratePanel } from '@/components/app/studio/panels/generate-panel';
import { Stage } from '@/components/app/studio/stage';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

const renderStage = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <Stage />
    </StudioProvider>
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('Stage, with nothing in the catalogue', () => {
  it('says so, instead of sitting on "Writing you a break…" for ever', async () => {
    /* The styles arrive server-side with the page, so an empty set at mount
       stays empty — there is no later arrival to wait for. The mount effect
       bailed before `setReady(true)` and its deps are `[ready]`, so nothing
       ever re-ran it and the Studio showed a loading line with no end.

       Two ways in, and the second is the one worth naming: an install whose
       seed has not run, and an install where every style row failed
       `styleParamsSchema` and was dropped — which the log records a line at a
       time while the screen says nothing at all. */
    render(
      <StudioProvider catalogue={{ ...testCatalogue(), styles: {}, styleGroups: [] }}>
        <Stage />
      </StudioProvider>
    );

    expect(await screen.findByText(/no styles in the catalogue/i)).toBeInTheDocument();
    expect(screen.queryByText(/Writing you a break/i)).not.toBeInTheDocument();
  });
});

describe('Stage', () => {
  it('shows one stave for A only, one for B only, and two for A + B', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const seg = within(screen.getByRole('radiogroup', { name: 'Which section to show and play' }));

    await user.click(seg.getByRole('radio', { name: 'A only' }));
    expect(screen.getAllByRole('img', { name: /Drum notation/ }).length).toBe(1);
    expect(seg.getByRole('radio', { name: 'A only' })).toHaveAttribute('aria-checked', 'true');

    await user.click(seg.getByRole('radio', { name: 'B only' }));
    expect(screen.getAllByRole('img', { name: /Drum notation/ }).length).toBe(1);
    expect(seg.getByRole('radio', { name: 'B only' })).toHaveAttribute('aria-checked', 'true');
    expect(seg.getByRole('radio', { name: 'A only' })).toHaveAttribute('aria-checked', 'false');

    await user.click(seg.getByRole('radio', { name: 'A + B' }));
    expect(screen.getAllByRole('img', { name: /Drum notation/ }).length).toBe(2);
    expect(seg.getByRole('radio', { name: 'A + B' })).toHaveAttribute('aria-checked', 'true');
  });

  it('names each arrangement cell for what it plays, and says so again when switched', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });
    const arr = within(screen.getByRole('group', { name: 'Arrangement' }));
    expect(arr.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Section 1 plays A',
      'Section 2 plays A',
      'Section 3 plays A',
      'Section 4 plays B',
    ]);
    await user.click(arr.getByRole('button', { name: 'Section 2 plays A' }));
    expect(arr.getByRole('button', { name: 'Section 2 plays B' })).toBeTruthy();
  });

  it('names each layer button by its layer, with its number as the shortcut', async () => {
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });
    const seg = within(screen.getByRole('radiogroup', { name: 'Difficulty layer' }));
    const buttons = seg.getAllByRole('radio');
    expect(buttons.map((b) => b.getAttribute('aria-keyshortcuts'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
    /* The accessible name is the name alone: the key is aria-hidden, so a
       screen reader does not say "1 Skeleton". */
    expect(
      ['Skeleton', 'Groove', 'Sixteenths', 'Ghosted', 'Full break'].map((name) =>
        seg.getByRole('radio', { name })
      )
    ).toEqual(buttons);
  });

  it('names the layer chip after the layer you are on, at an in-between layer too', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    await user.click(screen.getByRole('radio', { name: 'Sixteenths' }));
    expect(document.querySelector('.chip.rust')?.textContent).toMatch(/^Layer 3 ·/);

    await user.click(screen.getByRole('radio', { name: 'Skeleton' }));
    expect(document.querySelector('.chip.rust')?.textContent).toMatch(/^Layer 1 ·/);
  });

  it('toggles the counting guide and redraws the staff with the extra text rows', async () => {
    const user = userEvent.setup();
    renderStage();
    const [staff] = await screen.findAllByRole('img', { name: /Drum notation/ });

    // the guide ships on, so the shipped chart already carries its row
    const guideBtn = screen.getByRole('button', { name: 'Counting guide' });
    expect(guideBtn).toHaveAttribute('aria-pressed', 'true');
    expect(guideBtn.className).toMatch(/\bon\b/);

    const withGuide = staff.querySelectorAll('text').length;
    await user.click(guideBtn);
    expect(guideBtn).toHaveAttribute('aria-pressed', 'false');
    expect(guideBtn.className).not.toMatch(/\bon\b/);
    // turning it off removes the per-step counting labels
    expect(staff.querySelectorAll('text').length).toBeLessThan(withGuide);

    await user.click(guideBtn);
    expect(guideBtn).toHaveAttribute('aria-pressed', 'true');
    expect(staff.querySelectorAll('text').length).toBe(withGuide);
  });

  it('toggles sticking and redraws the staff with the limb row', async () => {
    const user = userEvent.setup();
    renderStage();
    const [staff] = await screen.findAllByRole('img', { name: /Drum notation/ });

    const stickingBtn = screen.getByRole('button', { name: 'Sticking' });
    expect(stickingBtn).toHaveAttribute('aria-pressed', 'false');

    const before = staff.querySelectorAll('text').length;
    await user.click(stickingBtn);
    expect(stickingBtn).toHaveAttribute('aria-pressed', 'true');
    expect(stickingBtn.className).toMatch(/\bon\b/);
    // the limb row prints a letter under every step that has a note
    expect(staff.querySelectorAll('text').length).toBeGreaterThan(before);

    await user.click(stickingBtn);
    expect(stickingBtn).toHaveAttribute('aria-pressed', 'false');
    expect(staff.querySelectorAll('text').length).toBe(before);
  });

  it('turns the faint preview off again after shipping on', async () => {
    const user = userEvent.setup();
    renderStage();
    const staves = await screen.findAllByRole('img', { name: /Drum notation/ });

    // the preview ships on, so the shipped chart already carries the faint
    // next-layer ink; some faint ink (the bar-number caption) is always
    // there regardless, so what proves the preview is the delta
    const faint = () =>
      staves[0].querySelectorAll('[stroke="var(--faint)"], [fill="var(--faint)"]');
    const preview = screen.getByRole('button', { name: 'Preview next layer' });
    expect(preview).toHaveAttribute('aria-pressed', 'true');
    const withPreview = faint().length;

    await user.click(preview);
    expect(preview).toHaveAttribute('aria-pressed', 'false');
    expect(faint().length).toBeLessThan(withPreview);

    await user.click(preview);
    expect(preview).toHaveAttribute('aria-pressed', 'true');
    expect(faint().length).toBe(withPreview);
  });

  it('resizes the chart from the Chart size slider', async () => {
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const size = screen.getByLabelText<HTMLInputElement>('Chart size');
    expect(Number(size.value)).toBe(100);

    fireEvent.change(size, { target: { value: '140' } });
    expect(screen.getByLabelText<HTMLInputElement>('Chart size').value).toBe('140');
  });

  it('adds and removes arrangement sections, and disables remove at one section', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const arrCount = () => document.querySelectorAll('.arr button').length;
    const start = arrCount();

    await user.click(screen.getByRole('button', { name: '+' }));
    expect(arrCount()).toBe(start + 1);

    // reduce all the way down to one section
    for (let i = arrCount(); i > 1; i--) {
      await user.click(screen.getByRole('button', { name: '−' }));
    }
    expect(arrCount()).toBe(1);
    expect(screen.getByRole('button', { name: '−' })).toBeDisabled();
  });

  it('flips an arrangement letter from A to B and back to A', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const firstArrBtn = () => document.querySelector<HTMLButtonElement>('.arr button')!;
    expect(firstArrBtn().textContent).toBe('A');

    await user.click(firstArrBtn());
    expect(firstArrBtn().textContent).toBe('B');

    await user.click(firstArrBtn());
    expect(firstArrBtn().textContent).toBe('A');
  });

  it('hides and shows the step editor', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const toggle = screen.getByRole('button', { name: 'Hide' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const cardBd = document.querySelector('.card-bd');
    expect(cardBd).not.toHaveAttribute('hidden');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Show' })).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.card-bd')).toHaveAttribute('hidden');
  });

  it('singularises the bar-count chip at one bar, and shows the style feel chip when the style has one', async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider catalogue={testCatalogue()}>
        <Stage />
        <GeneratePanel />
      </StudioProvider>
    );
    await screen.findAllByRole('img', { name: /Drum notation/ });

    // funk ships at 2 bars, and has no `feel`
    expect(document.querySelector('.chip.brass')?.textContent).toBe('2 bars');
    expect(document.querySelector('.chip.teal')).toBeNull();

    await user.click(screen.getByRole('radio', { name: '1' }));
    expect(document.querySelector('.chip.brass')?.textContent).toBe('1 bar');

    await user.selectOptions(screen.getByLabelText('Style'), 'reggae');
    expect(document.querySelector('.chip.teal')?.textContent).toBe('One drop');
  });

  it('switches which section the step editor edits', async () => {
    const user = userEvent.setup();
    renderStage();
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const editGroup = within(screen.getByRole('radiogroup', { name: 'Edit which section' }));
    expect(editGroup.getByRole('radio', { name: 'Edit A' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await user.click(editGroup.getByRole('radio', { name: 'Edit B' }));
    expect(editGroup.getByRole('radio', { name: 'Edit B' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(editGroup.getByRole('radio', { name: 'Edit A' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });
});
