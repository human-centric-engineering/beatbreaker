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

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BreakConsole } from '@/components/app/breaks/break-console';

// jsdom/happy-dom has no CSS loader, and the stylesheet is not what is under test
vi.mock('@/components/app/breaks/breaks.css', () => ({}));

/**
 * No `AudioContext` here, which is the point: `BreakAudio.init()` returns null
 * and the console has to stay usable. Notation and the critic do not need
 * audio, and a browser without Web Audio should still be able to read a chart.
 */
beforeEach(() => {
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
    // some of them are notes
    expect(document.querySelectorAll('.cell.on').length).toBeGreaterThan(0);
  });

  it('changes the chart when the layer changes', async () => {
    const user = userEvent.setup();
    render(<BreakConsole />);
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const before = document.querySelectorAll('.cell.on').length;
    await user.click(screen.getByRole('button', { name: 'L1' }));
    const after = document.querySelectorAll('.cell.on').length;

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

    await user.click(screen.getByRole('button', { name: 'New break' }));

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
});
