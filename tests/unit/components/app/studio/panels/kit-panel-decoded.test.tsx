// @vitest-environment happy-dom

/**
 * The branches in `kit-panel.tsx` that only differ once a recorded kit has
 * actually decoded — the "N recorded lanes loaded" / "N of your own samples
 * loaded" halves of `kitStatus`, and the percussion-source field that only
 * shows once `c.percCount` is non-zero. In the plain test environment those
 * never happen: `PackSource`/`UserSource` decode through a real `fetch` +
 * `AudioContext.decodeAudioData`, neither of which exists here (by design —
 * the rest of the Studio has to stay usable without them).
 *
 * `kitSlots`/`percCount` are plain numbers read straight off `PackSource`'s
 * and `UserSource`'s own `count()`/`percCount()` methods (see
 * `use-break-console.ts`'s `refreshSamples`) — nothing in that wiring reaches
 * into decoded audio itself, so a real kit that has finished decoding is
 * indistinguishable, from the panel's point of view, from a fake source whose
 * `count()` just returns a number. Mocking those two leaf modules is the same
 * shape of trade as mocking Prisma to test a route: the panel's own status-line
 * and conditional-field logic is real, only the decode itself is stubbed.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KitPanel } from '@/components/app/studio/panels/kit-panel';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

vi.mock('@/lib/app/breaks/audio/packs', () => {
  class FakePackSource {
    usePercSamples = true;
    constructor(_onChange?: () => void) {}
    count(_pack: string): number {
      return 3;
    }
    percCount(): number {
      return 2;
    }
    hit(): boolean {
      return false;
    }
    refresh(): void {
      /* never called without a live AudioContext */
    }
  }
  return { PackSource: FakePackSource };
});

vi.mock('@/lib/app/breaks/audio/user-kit', () => {
  class FakeUserSource {
    readonly names: Record<string, string> = {};
    constructor(_onChange?: () => void) {}
    count(): number {
      return 4;
    }
    hit(): boolean {
      return false;
    }
    refresh(): void {
      /* never called without a live AudioContext */
    }
  }
  return { UserSource: FakeUserSource };
});

const renderPanel = () =>
  render(
    <StudioProvider catalogue={testCatalogue()}>
      <KitPanel />
    </StudioProvider>
  );

beforeEach(() => {
  localStorage.clear();
});

describe('KitPanel with samples already decoded', () => {
  it('reports how many lanes of a recorded pack kit have decoded', async () => {
    const user = userEvent.setup();
    renderPanel();

    const kitPicker = () =>
      within(screen.getByRole('heading', { name: 'Kit' }).closest('.card')!).getByLabelText('Kit');
    await user.selectOptions(kitPicker(), 'virtuosity');

    expect(await screen.findByText('3 recorded lanes loaded')).toBeTruthy();
  });

  it('reports how many of your own samples have decoded', async () => {
    const user = userEvent.setup();
    renderPanel();

    const kitPicker = () =>
      within(screen.getByRole('heading', { name: 'Kit' }).closest('.card')!).getByLabelText('Kit');
    await user.selectOptions(kitPicker(), 'user');

    expect(await screen.findByText('4 of your own samples loaded')).toBeTruthy();
  });

  it('shows the percussion source toggle once recordings exist, and flips its label', async () => {
    const user = userEvent.setup();
    renderPanel();

    /* `percCount` is read off the pack source inside the same `refreshSamples`
       effect as `kitSlots`, which only re-runs when `kit` changes — on first
       mount it fires before the audio-init effect has set the ref, so it reads
       0 and stays there until something changes `kit`. Switching kits is what
       a real returning session with a decoded pack looks like anyway. */
    const kitPicker = () =>
      within(screen.getByRole('heading', { name: 'Kit' }).closest('.card')!).getByLabelText('Kit');
    await user.selectOptions(kitPicker(), 'virtuosity');

    // Perc is one of the VOICE_KEYS tabs, always present regardless of kit
    await user.click(screen.getByRole('button', { name: 'Perc' }));

    const field = await screen.findByText('Percussion source');
    const toggle = within(field.closest('.field')!).getByRole('button');

    // percCount is 2 (from the fake pack source) — the field starts on Recorded
    expect(toggle.textContent).toBe('Recorded (2)');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    await user.click(toggle);
    expect(toggle.textContent).toBe('Synthesised');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await user.click(toggle);
    expect(toggle.textContent).toBe('Recorded (2)');
  });
});
