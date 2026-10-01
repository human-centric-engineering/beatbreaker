// @vitest-environment happy-dom

/**
 * `SpeedsSection` on a published pattern's page (Phase 7C) — a server-
 * compatible component, rendered directly (no provider or router needed).
 * It shows what `GET /api/v1/public/patterns/:slug/speeds` would answer for
 * one layer, with a layer switcher, a video-only filter, and Report per row.
 *
 * `ReportButton` is shallow-mocked, as `page.test.tsx` mocks it for the same
 * page — its own behaviour is `report-button.test.tsx`'s.
 *
 * @see components/app/community/speeds-section.tsx
 */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/app/community/report-button', () => ({
  ReportButton: ({ speedId }: { speedId: string }) => (
    <button type="button" data-testid="report-button" data-speed-id={speedId}>
      Report
    </button>
  ),
}));

import { SpeedsSection } from '@/components/app/community/speeds-section';
import type { SpeedTableRow } from '@/lib/app/breaks/community/speed-tables';

const SLUG = 'cold000001';

function row(overrides: Partial<SpeedTableRow> = {}): SpeedTableRow {
  return {
    id: 'cspd00000000000000000001',
    position: 1,
    username: 'ghostnotes',
    bpm: 140,
    recordedAt: '2026-09-29T12:00:00.000Z',
    video: null,
    ...overrides,
  };
}

function base() {
  return {
    slug: SLUG,
    title: 'Cold Carpet',
    rows: [row()],
    total: 1,
    nextCursor: null as string | null,
    level: 2,
    videoOnly: false,
    signedIn: false,
    viewer: null as string | null,
  };
}

describe('the layer switcher', () => {
  it('links every layer with ?speeds=N#speeds, marking the current one', () => {
    render(<SpeedsSection {...base()} />);

    const nav = screen.getByRole('navigation', { name: 'Layer' });
    const groove = within(nav).getByRole('link', { name: 'Groove' });
    expect(groove).toHaveAttribute('href', `/p/${SLUG}?speeds=2#speeds`);
    expect(groove).toHaveAttribute('aria-current', 'true');

    const skeleton = within(nav).getByRole('link', { name: 'Skeleton' });
    expect(skeleton).toHaveAttribute('href', `/p/${SLUG}?speeds=1#speeds`);
    expect(skeleton).not.toHaveAttribute('aria-current');
  });

  it('keeps video=1 on every layer link while Video only is on', () => {
    render(<SpeedsSection {...base()} videoOnly />);

    const nav = screen.getByRole('navigation', { name: 'Layer' });
    const groove = within(nav).getByRole('link', { name: 'Groove' });
    expect(groove).toHaveAttribute('href', `/p/${SLUG}?speeds=2&video=1#speeds`);
  });
});

describe('Video only', () => {
  it('turns the filter on, keeping the current layer', () => {
    render(<SpeedsSection {...base()} />);

    const toggle = screen.getByRole('link', { name: 'Video only' });
    expect(toggle).toHaveAttribute('href', `/p/${SLUG}?speeds=2&video=1#speeds`);
    expect(toggle).not.toHaveAttribute('aria-current');
  });

  it('turns the filter off when it is already on', () => {
    render(<SpeedsSection {...base()} videoOnly />);

    const toggle = screen.getByRole('link', { name: 'Video only' });
    expect(toggle).toHaveAttribute('href', `/p/${SLUG}?speeds=2#speeds`);
    expect(toggle).toHaveAttribute('aria-current', 'true');
  });
});

describe('the rows', () => {
  it('show position, a link to the drummer, bpm, date, and a video badge', () => {
    render(
      <SpeedsSection
        {...base()}
        rows={[
          row({
            position: 3,
            username: 'ghostnotes',
            bpm: 150,
            recordedAt: '2026-09-20T08:00:00.000Z',
            video: {
              platform: 'youtube',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
            },
          }),
        ]}
      />
    );

    const item = screen.getByRole('listitem');
    expect(within(item).getByText('3')).toBeInTheDocument();
    const drummerLink = within(item).getByRole('link', { name: '@ghostnotes' });
    expect(drummerLink).toHaveAttribute('href', '/u/ghostnotes');
    expect(within(item).getByText('150 bpm')).toBeInTheDocument();
    expect(within(item).getByText('2026-09-20')).toBeInTheDocument();
    expect(within(item).getByText('video')).toBeInTheDocument();
  });

  it('says how many drummers are at the layer', () => {
    render(<SpeedsSection {...base()} total={41} />);
    expect(screen.getByText('41 drummers at Groove.')).toBeInTheDocument();
  });

  it('uses the singular for one drummer', () => {
    render(<SpeedsSection {...base()} total={1} />);
    expect(screen.getByText('1 drummer at Groove.')).toBeInTheDocument();
  });
});

describe('More speeds', () => {
  it('carries the cursor, current layer and filter', () => {
    render(<SpeedsSection {...base()} nextCursor="cspd00000000000000000099" videoOnly />);

    const more = screen.getByRole('link', { name: 'More speeds' });
    expect(more).toHaveAttribute(
      'href',
      `/p/${SLUG}?speeds=2&video=1&speedsCursor=cspd00000000000000000099#speeds`
    );
  });

  it('is absent with no next page', () => {
    render(<SpeedsSection {...base()} nextCursor={null} />);
    expect(screen.queryByRole('link', { name: 'More speeds' })).not.toBeInTheDocument();
  });
});

describe('Report', () => {
  it('shows only when signed in and not on the viewer’s own row', () => {
    const { rerender } = render(<SpeedsSection {...base()} signedIn={false} />);
    expect(screen.queryByTestId('report-button')).not.toBeInTheDocument();

    rerender(<SpeedsSection {...base()} signedIn viewer="someone-else" />);
    expect(screen.getByTestId('report-button')).toHaveAttribute(
      'data-speed-id',
      'cspd00000000000000000001'
    );

    rerender(<SpeedsSection {...base()} signedIn viewer="ghostnotes" />);
    expect(screen.queryByTestId('report-button')).not.toBeInTheDocument();
  });
});

describe('empty states', () => {
  it('says nobody has recorded a speed at the layer yet', () => {
    render(<SpeedsSection {...base()} rows={[]} total={0} />);
    expect(
      screen.getByText(/Nobody has recorded a speed at Groove yet\. Open it in the Studio/)
    ).toBeInTheDocument();
  });

  it('says there is no video-backed speed at the layer, when filtered', () => {
    render(<SpeedsSection {...base()} rows={[]} total={0} videoOnly />);
    expect(screen.getByText('No speeds with a video at Groove yet.')).toBeInTheDocument();
  });
});
