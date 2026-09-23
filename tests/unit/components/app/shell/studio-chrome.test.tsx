// @vitest-environment happy-dom

/**
 * The header and the footer: the two ends of the Studio frame.
 *
 * `studio-frame.test.tsx` mounts both through the whole frame, which is what
 * proves they assemble. What is reached here is the branch neither of those
 * journeys crosses — the footer's read-out has a stopped shape and a playing
 * shape, and only one of them is ever on screen at a time.
 *
 * Mounted inside a real `StudioProvider`. The two pieces of platform chrome are
 * replaced because they belong to Sunrise and are tested as Sunrise's: the
 * header's user controls need a theme and a session provider, and the footer's
 * cookie link needs the consent provider. What is under test here is the
 * Studio's own half of each.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioFooter } from '@/components/app/shell/studio-footer';
import { StudioHeader } from '@/components/app/shell/studio-header';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { BRAND } from '@/lib/brand';
import { beatOf } from '@/lib/app/breaks/audio/transport';
import { testCatalogue } from '@/tests/helpers/catalogue';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/shell/studio.css', () => ({}));

const openPreferences = vi.hoisted(() => vi.fn());
vi.mock('@/components/layouts/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/lib/consent', () => ({ useConsent: () => ({ openPreferences }) }));

beforeEach(() => {
  localStorage.clear();
  openPreferences.mockClear();
  positionOverride = undefined;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

const noop = () => {};

function renderHeader() {
  return render(
    <StudioProvider catalogue={testCatalogue()}>
      <StudioHeader
        onOpenTool={noop}
        onNewBreak={noop}
        toolsButtonRef={{ current: null }}
        container={null}
      />
    </StudioProvider>
  );
}

/**
 * Put the transport somewhere the test can steer it.
 *
 * `position` is state the scheduler owns, and driving a real one needs audio
 * hardware — but the branch under test is the footer's, not the scheduler's. So
 * `useStudio` is wrapped rather than replaced: every field is still the real
 * provider's, with one overridden, which keeps the footer's own arithmetic real.
 * Same technique as `stage-playhead.test.tsx`.
 */
let positionOverride: unknown;

vi.mock('@/components/app/studio/studio-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/app/studio/studio-provider')>();
  return {
    ...actual,
    useStudio: () => {
      const real = actual.useStudio();
      return positionOverride === undefined ? real : { ...real, position: positionOverride };
    },
  };
});

describe('StudioHeader', () => {
  it('names the pattern on screen, and links the mark home', async () => {
    renderHeader();
    await screen.findByRole('link');

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard');
    /* Asserted against BRAND.name rather than the fork's own name: the mark is
       cut out of the seam, and what matters is that the two halves of the
       wordmark still read as the one word the rest of the app is named. A
       literal here would pass while the seam did nothing. */
    expect(link.textContent).toBe(BRAND.name);

    // the title is whatever the generator just named the break, not a constant
    const title = document.querySelector('.studio-title');
    expect(title?.textContent).toBeTruthy();
    expect(title?.textContent).not.toBe('…');
  });

  it('offers the tools behind a button for the widths with no rail', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Tools' })).toBeTruthy();
  });
});

describe('StudioFooter', () => {
  it('reads out dashes while nothing is playing', async () => {
    render(
      <StudioProvider catalogue={testCatalogue()}>
        <StudioFooter />
      </StudioProvider>
    );
    await screen.findByText('Cookie preferences');

    const readout = document.querySelector('.studio-readout');
    // loop is a real count even at rest; the rest has nowhere to point yet
    expect(readout?.textContent).toContain('–');
    expect(readout?.textContent).toContain('loop');
  });

  it('opens the cookie preferences rather than linking away to them', async () => {
    render(
      <StudioProvider catalogue={testCatalogue()}>
        <StudioFooter />
      </StudioProvider>
    );
    const button = await screen.findByText('Cookie preferences');
    button.click();
    expect(openPreferences).toHaveBeenCalledTimes(1);
  });
});

describe('StudioFooter, playing', () => {
  it('says where in the break the playhead is', async () => {
    positionOverride = { letter: 'A', barIdx: 2, slot: 4, count: 0, bar: null };
    const { container } = render(
      <StudioProvider catalogue={testCatalogue()}>
        <StudioFooter />
      </StudioProvider>
    );
    await screen.findByText('Cookie preferences');

    const readout = container.querySelector('.studio-readout');
    expect(readout?.textContent).toContain('A');
    // bars are counted from one on screen and from zero in the position
    expect(readout?.textContent).toContain('3');
  });

  it('counts the beat the same way the transport does', async () => {
    positionOverride = { letter: 'A', barIdx: 0, slot: 4, count: 0, bar: null };
    let expected = '';
    function Probe() {
      const c = useStudio();
      if (c.view.A) expected = String(beatOf(c.view.A, 4));
      return null;
    }
    const { container } = render(
      <StudioProvider catalogue={testCatalogue()}>
        <Probe />
        <StudioFooter />
      </StudioProvider>
    );
    await screen.findByText('Cookie preferences');

    // the footer must not do its own beat arithmetic — same slot, same answer
    expect(container.querySelector('.studio-readout')?.textContent).toContain(expected);
  });

  it('falls back to dashes during a count-in, which is not yet the break', async () => {
    positionOverride = { letter: 'A', barIdx: 0, slot: 0, count: 1, bar: null };
    const { container } = render(
      <StudioProvider catalogue={testCatalogue()}>
        <StudioFooter />
      </StudioProvider>
    );
    await screen.findByText('Cookie preferences');
    expect(container.querySelector('.studio-readout')?.textContent).toContain('–');
  });
});
