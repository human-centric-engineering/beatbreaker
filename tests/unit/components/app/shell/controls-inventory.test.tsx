// @vitest-environment happy-dom

/**
 * The control inventory (task 5.16): `.context/app/controls.md` lists every
 * control in the Studio, and this holds it to that.
 *
 * It opens the Studio on a saved pattern of yours, with a shelf and a
 * history, then opens every drawer and every Patterns tab. Every control it
 * finds by role (button, slider, combobox, textbox, searchbox, radio, tab,
 * checkbox, menuitem) must match a row of the inventory by role and
 * accessible name. A name with a `<placeholder>` in it stands for the
 * per-pattern and per-lane names (`Mute <lane>`), and `<a|b|c>` for one of a
 * fixed set. A name that is only a free placeholder is refused: it would
 * match every control of its role. The buttons that open a row
 * in a list are named by the row's own text, so they are counted as one
 * family (`.item` with a `.nm`) rather than matched by name.
 *
 * It also fails on a row that matches nothing, so a control that goes takes
 * its row with it.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/shell/studio.css', () => ({}));
vi.mock('@/components/layouts/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/lib/consent', () => ({ useConsent: () => ({ openPreferences: vi.fn() }) }));
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    apiClient: {
      get: vi.fn(() => Promise.resolve([])),
      post: vi.fn(() => Promise.resolve({})),
      patch: vi.fn(() => Promise.resolve({})),
      delete: vi.fn(() => Promise.resolve({})),
    },
  };
});

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { TOOLS } from '@/components/app/shell/tool-rail';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const ROLES = [
  'button',
  'slider',
  'combobox',
  'textbox',
  'searchbox',
  'spinbutton',
  'radio',
  'tab',
  'checkbox',
  'menuitem',
] as const;
type Role = (typeof ROLES)[number];

type Row = { role: Role; name: string; matcher: RegExp; sometimes: boolean };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The inventory's rows: `| role | \`name\` | where | …`. */
function inventory(): Row[] {
  const md = readFileSync(join(process.cwd(), '.context/app/controls.md'), 'utf8');
  const isRole = (r: string): r is Role => (ROLES as readonly string[]).includes(r);
  const rows: Row[] = [];
  for (const line of md.split('\n')) {
    const m = /^\|\s*(\w+)\s*\|\s*`([^`]+)`\s*\|([^|]*)\|/.exec(line);
    if (!m || !isRole(m[1])) continue;
    const name = m[2];
    const source = name
      .split(/(<[^>]*>)/)
      .map((part) => {
        const slot = /^<([^>]*)>$/.exec(part);
        if (!slot) return escape(part);
        // `\|` in the table, since a bare `|` would end the cell
        const choices = slot[1].split('\\|');
        return choices.length > 1 ? `(?:${choices.map(escape).join('|')})` : '.+?';
      })
      .join('');
    rows.push({
      role: m[1],
      name,
      matcher: new RegExp(`^${source}$`),
      // a state the sweep does not reach: listed, but not required to be found
      sometimes: /\bwhen\b/.test(m[3]),
    });
  }
  return rows;
}

const MINE = 'cbrk00000000000000000001';
function initial(): InitialPattern {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 8,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return {
    id: MINE,
    title: 'Cold Carpet',
    mine: true,
    payload: breakPayload({
      bpm: 90,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A,
      B: deriveB(A, funk.params),
    }),
  };
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', `/studio/${MINE}`);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.stubGlobal('navigator', {
    ...navigator,
    requestMIDIAccess: () => Promise.resolve({ outputs: new Map() }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const isRowOpener = (el: HTMLElement) => el.classList.contains('item') && !!el.querySelector('.nm');

describe('the control inventory (5.16)', () => {
  it('lists every control a test can find by role in the Studio, and nothing that is not there', async () => {
    const user = userEvent.setup();
    const rows = inventory();
    expect(rows.length).toBeGreaterThan(50);
    // a name that is only a free placeholder would match every control of its role
    expect(rows.filter((r) => /^<[^\\>]*>$/.test(r.name)).map((r) => r.name)).toEqual([]);

    render(
      <StudioProvider
        catalogue={testCatalogue()}
        initial={initial()}
        pins={{
          practising: [
            {
              id: 'cpin-1',
              shelf: 'practising',
              position: 0,
              target: {
                kind: 'break',
                id: MINE,
                title: 'Cold Carpet',
                mine: true,
                style: 'funk',
                bpm: 90,
                meter: '4/4',
              },
            },
          ],
          later: [],
        }}
        history={[
          {
            id: 'cvis-1',
            level: 5,
            bpm: 90,
            target: { kind: 'break', id: MINE, title: 'Cold Carpet', mine: true },
          },
        ]}
      >
        <StudioFrame />
      </StudioProvider>
    );
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const unlisted = new Set<string>();
    const used = new Set<string>();
    let openers = 0;
    const sweep = (where: string) => {
      for (const role of ROLES) {
        const found = screen.queryAllByRole(role);
        const matched = new Set<HTMLElement>();
        for (const row of rows.filter((r) => r.role === role)) {
          const hits = screen.queryAllByRole(role, { name: row.matcher });
          if (hits.length) used.add(`${row.role} ${row.name}`);
          for (const el of hits) matched.add(el);
        }
        for (const el of found) {
          if (matched.has(el)) continue;
          if (isRowOpener(el)) {
            openers += 1;
            continue;
          }
          const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
          unlisted.add(`${where}: ${role} “${name}”`);
        }
      }
    };

    sweep('frame');
    // the grid's value picker, and the shortcuts sheet
    fireEvent.contextMenu(document.querySelector('.cell')!);
    sweep('picker');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    for (const tool of TOOLS) {
      const rail = within(screen.getByRole('navigation', { name: 'Tools' }));
      await user.click(rail.getByRole('button', { name: tool.label }));
      if (tool.id === 'patterns') {
        for (const tab of screen.getAllByRole('tab')) {
          await user.click(tab);
          sweep(`Patterns › ${tab.textContent}`);
        }
      } else {
        sweep(tool.label);
      }
    }

    expect([...unlisted].sort()).toEqual([]);
    expect(openers).toBeGreaterThan(0);
    expect(
      rows
        .filter((r) => !r.sometimes && !used.has(`${r.role} ${r.name}`))
        .map((r) => `${r.role} ${r.name}`)
    ).toEqual([]);
  }, 60_000);
});
