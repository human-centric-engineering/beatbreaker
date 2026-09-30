/**
 * Integration Test: GET /api/v1/public/drummers/:username (task 7B.4)
 *
 * No session. The real `getPublicDrummer` and `publicAbout`/`publicPart`
 * logic (`lib/app/breaks/community/public.ts` and `.../about.ts`) run over a
 * mocked Prisma and a mocked catalogue, because the whole point of this route
 * is the field-by-field switch logic — a stub that returned a canned public
 * view would only assert itself. `getPublicPattern` on the sibling route is
 * mocked at its own boundary instead (see `public/patterns/[slug]`), but
 * there the route has nothing of its own left to prove; here it does.
 *
 * @see app/api/v1/public/drummers/[username]/route.ts
 * @see lib/app/breaks/community/public.ts
 * @see lib/app/breaks/community/about.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v1/public/drummers/[username]/route';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    drummerProfile: { findUnique: vi.fn() },
    drummerAbout: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ listStyles: vi.fn() }));

import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { prisma } from '@/lib/db/client';

const USERNAME = 'ginger_baker';
const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const BASE = `http://localhost:3000/api/v1/public/drummers/${USERNAME}`;

function req(headers?: Record<string, string>): NextRequest {
  return new NextRequest(BASE, { headers });
}

function ctx(username = USERNAME) {
  return { params: Promise.resolve({ username }) };
}

interface Body {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code: string };
}

async function json(res: Response): Promise<Body> {
  return (await res.json()) as Body;
}

const PROFILE = { userId: USER_ID, username: USERNAME, bio: 'Funk drummer' };

const FULL_ABOUT_ROW = {
  purposes: ['learning'],
  styles: ['funk'],
  ability: 'advanced',
  styleAbility: { funk: 'advanced' },
  channels: [{ kind: 'youtube', url: 'https://www.youtube.com/@ringo', drumming: true }],
  public: { purposes: true, styles: true, ability: true, channels: true },
  askedAt: new Date('2026-09-24T10:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(PROFILE as never);
  vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(null);
  vi.mocked(listStyles).mockResolvedValue([{ key: 'funk' }, { key: 'jazz' }] as never);
});

describe('GET /api/v1/public/drummers/:username', () => {
  it('404s an unknown username', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    const res = await GET(req(), ctx());
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('404s a malformed username, the same body as unknown, without a query', async () => {
    const res = await GET(req(), ctx('!!not-a-username!!'));
    expect(res.status).toBe(404);
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — shape check short-circuits
  });

  it('answers 200 with the username, bio, and channels — public by default — when nothing has been said', async () => {
    const res = await GET(req(), ctx());
    expect(res.status).toBe(200);
    const { data } = await json(res);
    // no About-you row at all: purposes/styles/ability stay private by
    // default, but channels default public, so an empty list is shown
    expect(data).toEqual({ username: USERNAME, bio: 'Funk drummer', channels: [] });
  });

  it('never returns the user id or an email', async () => {
    vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(FULL_ABOUT_ROW as never);
    const { data } = await json(await GET(req(), ctx()));
    expect(data).not.toHaveProperty('userId');
    expect(data).not.toHaveProperty('email');
    expect(JSON.stringify(data)).not.toContain(USER_ID);
  });

  describe('each field, switched on and off', () => {
    it('shows purposes only when its switch is on', async () => {
      vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue({
        ...FULL_ABOUT_ROW,
        public: { ...FULL_ABOUT_ROW.public, purposes: false },
      } as never);
      const { data } = await json(await GET(req(), ctx()));
      expect(data).not.toHaveProperty('purposes');
    });

    it('shows styles only when its switch is on', async () => {
      vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue({
        ...FULL_ABOUT_ROW,
        public: { ...FULL_ABOUT_ROW.public, styles: false },
      } as never);
      const { data } = await json(await GET(req(), ctx()));
      expect(data).not.toHaveProperty('styles');
      // styleAbility names a style, so it goes dark with styles too
      expect(data).not.toHaveProperty('styleAbility');
    });

    it('shows ability only when its switch is on', async () => {
      vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue({
        ...FULL_ABOUT_ROW,
        public: { ...FULL_ABOUT_ROW.public, ability: false },
      } as never);
      const { data } = await json(await GET(req(), ctx()));
      expect(data).not.toHaveProperty('ability');
      expect(data).not.toHaveProperty('styleAbility');
    });

    it('shows channels only when its switch is on', async () => {
      vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue({
        ...FULL_ABOUT_ROW,
        public: { ...FULL_ABOUT_ROW.public, channels: false },
      } as never);
      const { data } = await json(await GET(req(), ctx()));
      expect(data).not.toHaveProperty('channels');
    });

    it('shows every field, whole, when every switch is on', async () => {
      vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(FULL_ABOUT_ROW as never);
      const { data } = await json(await GET(req(), ctx()));
      expect(data).toEqual({
        username: USERNAME,
        bio: 'Funk drummer',
        purposes: ['learning'],
        styles: ['funk'],
        ability: 'advanced',
        styleAbility: { funk: 'advanced' },
        channels: [
          {
            kind: 'youtube',
            url: 'https://www.youtube.com/@ringo',
            drumming: true,
            display: '@ringo',
          },
        ],
      });
    });

    it('never shows styleAbility for a style that is private even though ability is public', async () => {
      // styles is off; ability on; the per-style ability names a style, so it stays private too
      vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue({
        ...FULL_ABOUT_ROW,
        public: { purposes: false, styles: false, ability: true, channels: true },
      } as never);
      const { data } = await json(await GET(req(), ctx()));
      expect(data).not.toHaveProperty('styleAbility');
      expect(data?.ability).toBe('advanced');
    });

    it('a private field never appears, even set, with every switch off', async () => {
      vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue({
        ...FULL_ABOUT_ROW,
        public: { purposes: false, styles: false, ability: false, channels: false },
      } as never);
      const { data } = await json(await GET(req(), ctx()));
      expect(data).toEqual({ username: USERNAME, bio: 'Funk drummer' });
    });
  });

  it('carries an ETag and a revalidate-always Cache-Control', async () => {
    const res = await GET(req(), ctx());
    expect(res.headers.get('ETag')).toMatch(/^W\/"[\w-]+"$/);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });

  it('answers a matching If-None-Match with 304 and no body', async () => {
    const first = await GET(req(), ctx());
    const etag = first.headers.get('ETag') as string;

    const second = await GET(req({ 'If-None-Match': etag }), ctx());
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
  });
});
