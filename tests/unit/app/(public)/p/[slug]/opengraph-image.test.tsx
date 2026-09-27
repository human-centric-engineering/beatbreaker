// @vitest-environment happy-dom

/**
 * The link preview for a shared pattern (Phase 6, task 6.6). `next/og`'s
 * `ImageResponse` is mocked out — this file is about what BeatBreaker feeds
 * it, not about rendering a PNG under vitest.
 *
 * @see app/(public)/p/[slug]/opengraph-image.tsx
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { imageResponse } = vi.hoisted(() => ({
  imageResponse: vi.fn(function ImageResponseMock(el: unknown, size: unknown) {
    return { el, size };
  }),
}));
vi.mock('next/og', () => ({ ImageResponse: imageResponse }));
vi.mock('@/lib/app/breaks/community/public', () => ({ getPublicPattern: vi.fn() }));
vi.mock('@/lib/app/breaks/community/svg-markup', () => ({ svgMarkup: vi.fn(() => '<svg/>') }));
vi.mock('@/lib/app/breaks/engrave', () => ({
  engrave: vi.fn(() => ({ width: 100, height: 50, nodes: [], label: '' })),
}));

import { renderToStaticMarkup } from 'react-dom/server';

import Image, { size } from '@/app/(public)/p/[slug]/opengraph-image';
import { getPublicPattern } from '@/lib/app/breaks/community/public';
import { svgMarkup } from '@/lib/app/breaks/community/svg-markup';
import { engrave } from '@/lib/app/breaks/engrave';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testStyle } from '@/tests/helpers/catalogue';

const params = (slug = 'cold000001') => Promise.resolve({ slug });

function doc() {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 3,
    bars: 4,
    density: 50,
    ghosts: 50,
  });
  return breakPayload({
    bpm: 90,
    swing: 10,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('opengraph-image', () => {
  it('exports the fixed 1200x630 size', () => {
    expect(size).toEqual({ width: 1200, height: 630 });
  });

  it('yields the site name only, without engraving anything, for a missing pattern', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue(null);
    await Image({ params: params() });
    expect(engrave).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a miss must not engrave
    expect(svgMarkup).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a miss must not engrave
    expect(imageResponse).toHaveBeenCalledTimes(1);
    expect(imageResponse.mock.calls[0][1]).toEqual({ width: 1200, height: 630 });
  });

  it('engraves only the first two bars of section A and builds the image once', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue({
      id: 'cbrk00000000000000000001',
      slug: 'cold000001',
      title: 'Cold Carpet',
      author: 'ghostnotes',
      meter: '4/4',
      bpm: 90,
      doc: doc(),
    } as never);

    await Image({ params: params() });

    expect(engrave).toHaveBeenCalledTimes(1);
    const [pat] = vi.mocked(engrave).mock.calls[0];
    expect((pat as { bars: unknown[] }).bars).toHaveLength(2);
    expect(svgMarkup).toHaveBeenCalledTimes(1);
    expect(imageResponse).toHaveBeenCalledTimes(1);
    expect(imageResponse.mock.calls[0][1]).toEqual({ width: 1200, height: 630 });
    // the author IS on the card when the pattern has one
    const html = renderToStaticMarkup(imageResponse.mock.calls[0][0] as never);
    expect(html).toContain('@ghostnotes');
  });

  it('never reaches the data layer for a slug that fails validation, and falls back to the site name', async () => {
    await Image({ params: params('Not-A-Valid-Slug!') });

    expect(getPublicPattern).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an invalid slug must short-circuit before the DB
    expect(engrave).not.toHaveBeenCalled();
    expect(svgMarkup).not.toHaveBeenCalled();
    expect(imageResponse).toHaveBeenCalledTimes(1);
    expect(imageResponse.mock.calls[0][1]).toEqual({ width: 1200, height: 630 });
  });

  it('omits the "@handle ·" prefix when the pattern has no author', async () => {
    vi.mocked(getPublicPattern).mockResolvedValue({
      id: 'cbrk00000000000000000002',
      slug: 'cold000001',
      title: 'No Name Yet',
      author: null,
      meter: '4/4',
      bpm: 100,
      doc: doc(),
    } as never);

    await Image({ params: params() });

    const html = renderToStaticMarkup(imageResponse.mock.calls[0][0] as never);
    expect(html).toContain('No Name Yet');
    expect(html).not.toContain('@');
  });
});
