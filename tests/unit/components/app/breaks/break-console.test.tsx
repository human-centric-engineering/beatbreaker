// @vitest-environment happy-dom

/**
 * The console, mounted.
 *
 * Every other test in this port exercises a pure function. This one is the
 * check that the whole thing actually assembles: generator → critic → layer
 * reduction → engraver → React, in a DOM, with no audio hardware.
 *
 * It asserts on **what is drawn**, not on what the modules return. A chart with
 * no noteheads, a score of `–`, or a grid with no cells would all pass a test
 * that only checked the component rendered without throwing, and all three are
 * ways this has actually broken during the port.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BreakConsole } from '@/components/app/breaks/break-console';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { stashPendingLink } from '@/lib/app/breaks/pending-link';
import { encodeBreak } from '@/lib/app/breaks/share';

// jsdom/happy-dom has no CSS loader, and the stylesheet is not what is under test
vi.mock('@/components/app/breaks/breaks.css', () => ({}));

/** A grid cell holding a note: its value is in `data-on`, and 0 is empty. */
const NOTES = ".cell:not([data-on='0'])";

/**
 * No `AudioContext` here, which is the point: `BreakAudio.init()` returns null
 * and the console has to stay usable. Notation and the critic do not need
 * audio, and a browser without Web Audio should still be able to read a chart.
 */
beforeEach(() => {
  // every one of these starts from a browser that has never seen the app
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('BreakConsole', () => {
  it('generates and engraves a break on mount', async () => {
    render(<BreakConsole />);

    // the placeholder is gone, so generation finished
    // A and B are both on screen in A+B mode
    const staves = await screen.findAllByRole('img', { name: /Drum notation/ });
    expect(staves.length).toBe(2);

    const staff = staves[0];
    // an engraved bar is not an empty <svg>: it has a staff, stems and noteheads
    expect(staff.querySelectorAll('line').length).toBeGreaterThan(10);
    expect(staff.querySelectorAll('ellipse').length).toBeGreaterThan(0);
  });

  it('scores the break rather than showing a placeholder', async () => {
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const score = document.querySelector('.scorenum');
    expect(score).toBeTruthy();
    const n = Number(score?.textContent?.replace(/\D+/g, ''));
    // /100 is part of the text, so a real score reads as e.g. "84100"
    expect(String(score?.textContent)).toMatch(/\d+\/100|\d+100/);
    expect(Number.isNaN(n)).toBe(false);

    // and the playability checks are listed, passing or failing
    expect(document.querySelectorAll('.check').length).toBe(6);
  });

  it('draws a grid cell for every step of every lane it carries', async () => {
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const cells = document.querySelectorAll('.cell');
    // 2 bars x 16 steps x 5 lanes for a funk kit, at least
    expect(cells.length).toBeGreaterThanOrEqual(2 * 16 * 5);
    // some of them are notes — a cell's value lives in `data-on`, which is
    // what the stylesheet keys off too, so 0 is the empty cell
    expect(document.querySelectorAll(NOTES).length).toBeGreaterThan(0);
  });

  it('changes the chart when the layer changes', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const before = document.querySelectorAll(NOTES).length;
    await user.click(screen.getByRole('button', { name: 'L1' }));
    const after = document.querySelectorAll(NOTES).length;

    /* L1 is the skeleton — kick on the beat, backbeat, 8th hats — so it must
       carry strictly fewer notes than the full break. Equal would mean the
       reduction never reached the grid, which is exactly the bug where the
       editor drew the stored pattern while the chart drew the reduced one. */
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  it('survives a browser with no Web Audio, and says so rather than throwing', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const play = screen.getByRole('button', { name: 'Play or stop' });
    await user.click(play);

    // no AudioContext in this environment, so the transport refuses to start
    // and the button stays where it was — the chart is still readable
    expect(play.textContent).toContain('Play');
    expect(screen.getAllByRole('img', { name: /Drum notation/ }).length).toBeGreaterThan(0);
  });

  it('writes a new break when asked', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const titleOf = () => document.querySelector('.title-block h2')?.textContent;
    const first = titleOf();
    const firstGrid = [...document.querySelectorAll('.cell')]
      .map((c) => c.getAttribute('data-on'))
      .join('');

    await user.click(screen.getByRole('button', { name: /^New break/ }));

    const secondGrid = [...document.querySelectorAll('.cell')]
      .map((c) => c.getAttribute('data-on'))
      .join('');
    /* A different seed should give a different break. Names come from an
       18x18 word list so a collision is possible; the grid is the real check. */
    expect(secondGrid === firstGrid && titleOf() === first).toBe(false);
  });

  it('cycles a grid cell on click', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const cells = [...document.querySelectorAll<HTMLButtonElement>('.cell')];
    const empty = cells.find((c) => c.getAttribute('data-on') === '0');
    expect(empty).toBeTruthy();

    await user.click(empty as HTMLButtonElement);

    const again = document.querySelector<HTMLButtonElement>(
      `.cell[data-bar="${empty?.dataset.bar}"][data-slot="${empty?.dataset.slot}"]`
    );
    expect(again?.getAttribute('data-on')).toBe('1');
    // and it is pinned to the layer it was drawn at, so the reduction keeps it
    expect(document.querySelectorAll('.cell.pinned').length).toBeGreaterThan(0);
  });

  it('loads a famous break from the library', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    await user.click(screen.getByRole('tab', { name: 'Library' }));
    const row = await screen.findByRole('button', { name: /Funky Drummer/ });
    await user.click(row);

    expect(document.querySelector('.title-block h2')?.textContent).toBe('Funky Drummer');
    // it brings its own tempo with it
    expect(document.querySelector('.bpmval')?.textContent).toContain('94');
  });

  it('opens a shared link that was stashed on the way through sign-in (H5)', async () => {
    const A = generatePattern({
      style: 'funk',
      meter: '4/4',
      seed: 5,
      bars: 2,
      density: 50,
      ghosts: 50,
    });
    A.name = 'The One Somebody Sent';
    const code = encodeBreak({
      bpm: 101,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A,
      B: deriveB(A),
    });
    window.history.replaceState(null, '', '/breaks');
    stashPendingLink(localStorage, `#b=${code}`);

    render(<BreakConsole />);

    expect(await screen.findByRole('heading', { name: 'The One Somebody Sent' })).toBeTruthy();
    // the address bar is the link that was sent, and the stash is spent
    expect(window.location.hash).toBe(`#b=${code}`);
    expect(localStorage.getItem('bb.pendingLink')).toBeNull();
    window.history.replaceState(null, '', '/breaks');
  });

  it('round-trips the break through a share code', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    await user.click(screen.getByRole('tab', { name: 'Export' }));

    const written: string[] = [];
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: (t: string) => {
          written.push(t);
          return Promise.resolve();
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Copy break code' }));
    expect(written[0]?.length).toBeGreaterThan(100);

    // and the code it produced is one it can read back
    const box = screen.getByLabelText('Load a break code');
    await user.click(box);
    await user.paste(written[0]);
    await user.click(screen.getByRole('button', { name: 'Load it' }));

    expect(await within(document.body).findByText('Break loaded')).toBeTruthy();
  });
  it('keeps your tuning of a kit, and hands it back when you reset', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    await user.click(screen.getByRole('tab', { name: 'Kit' }));

    /* Nothing is tuned yet, so there is nothing to put back — the reset has to
       say so rather than sitting there live and doing nothing. */
    const resetKit = screen.getByRole('button', { name: 'Reset whole kit' });
    expect(resetKit).toBeDisabled();

    /* Two cards carry a Room: the kit's whole-mix send, and the one lane the
       Voice card is editing. Scope to the card, or this asserts on whichever
       happens to be first in the DOM. */
    const kitCard = within(screen.getByRole('heading', { name: 'Kit' }).closest('.card')!);
    const room = kitCard.getByLabelText<HTMLInputElement>('Room');
    const shipped = room.value;
    fireEvent.change(room, { target: { value: '61' } });

    expect(kitCard.getByLabelText<HTMLInputElement>('Room').value).toBe('61');
    expect(screen.getByRole('button', { name: 'Reset whole kit' })).toBeEnabled();
    // it is an override of the kit's numbers, saved against that kit by name
    expect(JSON.parse(localStorage.getItem('bb.sound') ?? '{}')).toMatchObject({
      studio70: { master: { room: 0.61 } },
    });

    await user.click(screen.getByRole('button', { name: 'Reset whole kit' }));
    expect(kitCard.getByLabelText<HTMLInputElement>('Room').value).toBe(shipped);
  });

  it('shows the knobs the loaded engine actually has', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });
    await user.click(screen.getByRole('tab', { name: 'Kit' }));

    /* A synthesised hi-hat is built from noise and a filter, so it has a size
       and a brightness. A recording has neither — what is left is how fast it
       plays back. Showing "Bright" over a sample would be a knob that lies. */
    const voice = () => within(screen.getByRole('heading', { name: 'Voice' }).closest('.card')!);
    expect(voice().getByLabelText('Size')).toBeTruthy();
    expect(voice().getByLabelText('Bright')).toBeTruthy();

    await user.selectOptions(screen.getByLabelText('Kit'), 'virtuosity');
    expect(voice().queryByLabelText('Bright')).toBeNull();
    expect(voice().getByLabelText('Speed')).toBeTruthy();
  });

  it('saves a break and gives it back', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const name = document.querySelector('.title-block h2')?.textContent ?? '';
    await user.click(screen.getByRole('tab', { name: 'Library' }));
    await user.click(screen.getByRole('button', { name: '＋ Save current' }));

    /* The delete button is named after the break too, so match the row rather
       than anything carrying the name. */
    const savedRow = (_n: string, el: Element) =>
      el.classList.contains('item') && !!el.textContent?.startsWith(name);
    expect(await screen.findByRole('button', { name: savedRow })).toBeTruthy();

    // a new break moves the grid on; loading the saved one has to bring it back
    const gridOf = () =>
      [...document.querySelectorAll('.cell')].map((c) => c.getAttribute('data-on')).join('');
    const before = gridOf();
    await user.click(screen.getByRole('button', { name: /^New break/ }));
    expect(gridOf()).not.toBe(before);

    await user.click(screen.getByRole('tab', { name: 'Library' }));
    await user.click(screen.getByRole('button', { name: savedRow }));
    expect(gridOf()).toBe(before);

    await user.click(screen.getByRole('button', { name: `Delete ${name}` }));
    expect(screen.queryByRole('button', { name: savedRow })).toBeNull();
  });

  it('clears a section without losing it', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const notes = () => document.querySelectorAll(NOTES).length;
    const before = notes();
    expect(before).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: 'Doctor' }));
    await user.click(screen.getByRole('button', { name: 'Clear section' }));
    expect(notes()).toBe(0);

    await user.click(screen.getByRole('button', { name: '↶ Undo' }));
    expect(notes()).toBe(before);
  });

  it('drops the tempo to suit the layer, and puts it back at L5', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const bpm = () => Number(document.querySelector('.bpmval')?.textContent?.match(/\d+/)?.[0]);
    const written = bpm();

    await user.click(screen.getByRole('tab', { name: 'Practice' }));
    await user.click(screen.getByRole('button', { name: 'Off' }));
    await user.click(screen.getByRole('button', { name: 'L1' }));

    // L1 is a practice speed, not the break's speed
    expect(bpm()).toBeLessThan(written);

    await user.click(screen.getByRole('button', { name: 'L5' }));
    expect(bpm()).toBe(written);

    /* Dragging the tempo while the match is on sets the speed for the layer
       you are on, not the break's — so practising L1 slowly must not quietly
       rewrite the break as a slow break. */
    await user.click(screen.getByRole('button', { name: 'L1' }));
    const slow = bpm();
    fireEvent.change(screen.getByLabelText('Tempo'), { target: { value: String(slow - 10) } });
    await user.click(screen.getByRole('button', { name: 'L5' }));
    expect(bpm()).toBeGreaterThan(slow);
    await user.click(screen.getByRole('button', { name: 'L1' }));
    expect(Math.abs(bpm() - (slow - 10))).toBeLessThanOrEqual(1);
  });

  it('drives the console from the keyboard', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const notes = () => document.querySelectorAll(NOTES).length;
    const full = notes();
    await user.keyboard('1');
    expect(notes()).toBeLessThan(full);

    // and typing into a field is typing, not a shortcut
    await user.click(screen.getByRole('tab', { name: 'Export' }));
    const box = screen.getByLabelText('Load a break code');
    await user.click(box);
    await user.keyboard('5');
    expect((box as HTMLTextAreaElement).value).toBe('5');
    expect(notes()).toBeLessThan(full);
  });

  it('draws the next layer faintly when asked, and nothing at the top', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    const staves = await screen.findAllByRole('img', { name: /Drum notation/ });

    /* The preview is the next layer's notes in faint ink. L5 is the whole
       break, so above it there is nothing to show and the button has to say so
       rather than previewing an empty difference. */
    const faint = () =>
      staves[0].querySelectorAll('[stroke="var(--faint)"], [fill="var(--faint)"]');
    const preview = screen.getByRole('button', { name: 'Preview next layer' });
    expect(preview).toBeEnabled();
    expect(faint().length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'L5' }));
    expect(screen.getByRole('button', { name: 'Preview next layer' })).toBeDisabled();
  });

  it('shows what the style asked for before you take the lanes over', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    // the picker is readable while the style owns it, so you can see the roster
    const picker = document.querySelector('.lanepick');
    expect(picker?.getAttribute('data-locked')).toBe('1');

    await user.click(screen.getByRole('button', { name: 'Following the style' }));
    expect(document.querySelector('.lanepick')?.getAttribute('data-locked')).toBe('0');

    /* Taking it over must not change the sound: it starts from the roster that
       was on screen, not from an empty kit. */
    const toms = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Toms' });
    expect(toms.checked).toBe(false);
    await user.click(toms);
    expect(document.querySelectorAll('.gridrow').length).toBeGreaterThan(5);
  });
});
