/**
 * `/breaks` is where the console lived. Every share link handed out before the
 * move points there, so the route stays and redirects — and the redirect must
 * stay bare, because the browser only carries a `#b=` fragment across to a
 * target that has none of its own (H5).
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  permanentRedirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

import BreaksRedirect from '@/app/(protected)/breaks/page';
import { permanentRedirect } from 'next/navigation';

describe('/breaks', () => {
  it('sends every old link to the Studio, permanently and without a fragment', () => {
    expect(() => BreaksRedirect()).toThrow('NEXT_REDIRECT');
    expect(permanentRedirect).toHaveBeenCalledWith('/studio');
  });
});
