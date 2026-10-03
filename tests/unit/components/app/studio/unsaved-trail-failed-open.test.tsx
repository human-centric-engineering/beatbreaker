// @vitest-environment happy-dom

/**
 * The Back trail when the pattern being opened will not load (task 5.13).
 *
 * Letting an unsaved roll go puts it on the trail. If what was to replace it
 * then fails to load, the roll is still on the stage, so it must come off the
 * trail again. Otherwise leaving it later adds a second entry for the same
 * notes. The share module is wrapped so one pattern's document fails to
 * decode, which is the failure `loadPayload` reports.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/shell/studio.css', () => ({}));
vi.mock('@/components/layouts/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/lib/consent', () => ({ useConsent: () => ({ openPreferences: vi.fn() }) }));
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});
vi.mock('@/lib/app/breaks/share', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/app/breaks/share')>();
  return {
    ...actual,
    breakDocFromPayload: (...args: Parameters<typeof actual.breakDocFromPayload>) => {
      if (args[0].A.n === 'Broken') throw new Error('will not decode');
      return actual.breakDocFromPayload(...args);
    },
  };
});

import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import { generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import type { HistoryItem } from '@/lib/validations/history';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const catalogue = testCatalogue();
const BROKEN = 'cbrk00000000000000000003';

function brokenDoc() {
  const A = {
    ...generatePattern({
      style: testStyle('funk'),
      meter: '4/4',
      seed: 3,
      bars: 1,
      density: 50,
      ghosts: 50,
    }),
    name: 'Broken',
  };
  return breakPayload({ bpm: 90, swing: 0, level: 5, arrangement: ['A'], A, B: A });
}

const visit: HistoryItem = {
  id: 'cvis-broken',
  level: 5,
  bpm: 90,
  target: { kind: 'break', id: BROKEN, title: 'Broken', mine: false },
};

function Probe() {
  return <div data-testid="toast">{useStudio().notice?.message}</div>;
}

const unsavedRows = () =>
  within(screen.getByRole('tabpanel'))
    .queryAllByRole('button')
    .filter((b) => /^Unsaved · /.test(b.querySelector('b')?.textContent ?? ''));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/studio');
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({});
  vi.mocked(apiClient.get)
    .mockReset()
    .mockResolvedValue({ id: BROKEN, title: 'Broken', mine: false, doc: brokenDoc() });
});

describe('a replacement that fails to load (5.13)', () => {
  it('leaves the roll off the trail, so leaving it later puts it there once', async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider catalogue={catalogue} history={[visit]}>
        <StudioFrame />
        <Probe />
      </StudioProvider>
    );
    await waitFor(() => expect(document.querySelector('.studio-title')?.textContent).not.toBe('…'));
    const rolled = document.querySelector('.studio-title')?.textContent;

    await user.click(document.querySelector<HTMLButtonElement>('.studio-back')!);
    await waitFor(() =>
      expect(screen.getByTestId('toast').textContent).toBe('That pattern would not open')
    );
    expect(document.querySelector('.studio-title')?.textContent).toBe(rolled);

    const rail = within(screen.getByRole('navigation', { name: 'Tools' }));
    await user.click(rail.getByRole('button', { name: 'Patterns' }));
    await user.click(screen.getByRole('tab', { name: /^Recent/ }));
    expect(unsavedRows()).toHaveLength(0);

    await user.keyboard('n');
    await waitFor(() => expect(unsavedRows()).toHaveLength(1));
  });
});
