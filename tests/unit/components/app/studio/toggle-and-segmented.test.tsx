// @vitest-environment happy-dom

/**
 * The Studio's one toggle and one segmented choice (Phase 5, E19), on their
 * own and across every panel that uses them.
 *
 * The sweep at the bottom is the behaviour the grep in
 * `shell/studio-controls.test.ts` cannot see: that every toggle in the Studio,
 * pressed, keeps the name it had — the state is in `aria-pressed`, never in
 * the words.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportPanel } from '@/components/app/studio/panels/export-panel';
import { GeneratePanel } from '@/components/app/studio/panels/generate-panel';
import { KitPanel } from '@/components/app/studio/panels/kit-panel';
import { PracticePanel } from '@/components/app/studio/panels/practice-panel';
import { Segmented } from '@/components/app/studio/segmented';
import { Stage } from '@/components/app/studio/stage';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { testCatalogue } from '@/tests/helpers/catalogue';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

function OneToggle() {
  const [on, setOn] = useState(false);
  return (
    <Toggle pressed={on} onPressedChange={setOn} label="Mute Snare">
      Mute
    </Toggle>
  );
}

function OneChoice({ onChange }: { onChange?: (n: number) => void }) {
  const [n, setN] = useState(2);
  return (
    <Segmented
      label="Bars"
      options={[1, 2, 3].map((v) => ({ value: v, face: String(v) }))}
      value={n}
      onChange={(v) => {
        setN(v);
        onChange?.(v);
      }}
    />
  );
}

describe('Toggle', () => {
  it('says its state in aria-pressed and the lit style, under one name', async () => {
    const user = userEvent.setup();
    render(<OneToggle />);
    const btn = screen.getByRole('button', { name: 'Mute Snare' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).not.toHaveClass('on');

    await user.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveClass('on');
    expect(btn).toHaveTextContent(/^Mute$/);

    await user.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Segmented', () => {
  it('is a named radio group with the choice checked', () => {
    render(<OneChoice />);
    const group = within(screen.getByRole('radiogroup', { name: 'Bars' }));
    expect(group.getAllByRole('radio').map((r) => r.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('is one tab stop, and the arrows move the choice and the focus, wrapping', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <button type="button">before</button>
        <OneChoice onChange={onChange} />
      </>
    );
    await user.click(screen.getByRole('button', { name: 'before' }));
    await user.tab();
    const radio = (name: string) => screen.getByRole('radio', { name });
    expect(radio('2')).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(radio('3')).toHaveFocus();
    expect(radio('3')).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowRight}');
    expect(radio('1')).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowUp}');
    expect(radio('3')).toHaveAttribute('aria-checked', 'true');
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([3, 1, 3]);

    /* Tab leaves the group rather than walking through it. */
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('leaves ⌥← and ⌥→ to the history', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OneChoice onChange={onChange} />);
    screen.getByRole('radio', { name: '2' }).focus();
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps a tab stop when nothing is chosen', () => {
    render(
      <Segmented
        label="Voice"
        options={[
          { value: 'a', face: 'A' },
          { value: 'b', face: 'B' },
        ]}
        value="z"
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('every toggle in the Studio', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps its name when pressed', async () => {
    const user = userEvent.setup();
    /* A Web MIDI with no outputs: MIDI out is offered (it is disabled where
       there is none at all) and pressing it finds nothing to open. */
    vi.stubGlobal('navigator', {
      ...navigator,
      requestMIDIAccess: () => Promise.resolve({ outputs: new Map() }),
    });
    render(
      <StudioProvider catalogue={testCatalogue()}>
        <Stage />
        <GeneratePanel />
        <PracticePanel />
        <KitPanel />
        <ExportPanel />
      </StudioProvider>
    );
    await screen.findAllByRole('img', { name: /Drum notation/ });

    const toggles = [...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];
    /* Stage (3), Generate's locks (4), Practise (click, match, a mute per lane)
       and Share's MIDI out: enough that a missing panel would show. */
    expect(toggles.length).toBeGreaterThanOrEqual(12);

    const checked: string[] = [];
    for (const btn of toggles) {
      if (btn.disabled) continue;
      const name = btn.getAttribute('aria-label') ?? btn.textContent;
      const text = btn.textContent;
      const was = btn.getAttribute('aria-pressed');
      await user.click(btn);
      /* MIDI out finds no outputs here and stays off; everything else flips. */
      if (name !== 'MIDI out') expect(btn.getAttribute('aria-pressed')).not.toBe(was);
      expect(btn.getAttribute('aria-label') ?? btn.textContent).toBe(name);
      expect(btn.textContent).toBe(text);
      checked.push(name ?? '');
    }
    expect(checked).toEqual(
      expect.arrayContaining(['Counting guide', 'Lock Kick', 'Click', 'Match tempo', 'MIDI out'])
    );
  });
});
