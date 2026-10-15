// @vitest-environment happy-dom

/**
 * `CrossRhythmCard` (13-b), in the Edit drawer: a cross-rhythm written from
 * its ratio as a study of the section or a fill at the end of a bar, the
 * toast saying which — or why not. What it writes is `crossRhythm`'s, tested
 * in `tests/unit/lib/app/breaks/cross-rhythm.test.ts`; this is the wiring.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CrossRhythmCard } from '@/components/app/studio/panels/cross-rhythm-card';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

function Probe() {
  const c = useStudio();
  const pat = c.patterns[c.editing];
  return (
    <>
      <div role="status">{c.notice?.message}</div>
      <div data-testid="ratio">{pat?.poly?.ratio ?? 'none'}</div>
      <div data-testid="spans">{pat?.polySpans?.length ?? 0}</div>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

const mount = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <CrossRhythmCard />
      <Probe />
    </StudioProvider>
  );

describe('CrossRhythmCard', () => {
  it('writes a 3:2 fill at the end of a bar of the groove', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole('button', { name: 'Write the fill' }));
    expect(screen.getByRole('status')).toHaveTextContent(/A 3:2 fills the end of bar 1/);
    expect(screen.getByTestId('spans')).toHaveTextContent('1');
    expect(screen.getByTestId('ratio')).toHaveTextContent('none');
  });

  it('makes the section a 3:2 study, and then says why a fill cannot go in it', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole('button', { name: 'Write a study' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Section A is a 3:2 study/);
    expect(screen.getByTestId('ratio')).toHaveTextContent('3:2');

    await user.click(screen.getByRole('button', { name: 'Write the fill' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      /Not written: this section is already a cross-rhythm study/
    );
  });

  it('names its hands only where the cross-rhythm is on a hand’s lane', async () => {
    mount();
    expect(await screen.findByRole('combobox', { name: /Hands/ })).toBeTruthy();
  });
});
