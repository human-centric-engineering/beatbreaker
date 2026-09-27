/**
 * Your drummer profile (task 6.2): whether a username is yours to take, and
 * choosing, changing, or holding one — where the rules in `username.ts` meet
 * the database.
 *
 * Prisma is mocked at the module boundary; `$transaction` is mocked to call
 * its callback with a `tx` object of the same mocked models, since
 * `saveDrummerProfile` runs its write inside one.
 *
 * @see lib/app/breaks/community/profile.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    drummerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    reservedUsername: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { ConflictError } from '@/lib/api/errors';
import {
  getDrummerProfile,
  saveDrummerProfile,
  usernameAvailability,
  usernameOf,
} from '@/lib/app/breaks/community/profile';
import { USERNAME_MESSAGES } from '@/lib/app/breaks/community/username';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const DAY_MS = 24 * 60 * 60 * 1000;

function tx() {
  return {
    reservedUsername: prisma.reservedUsername,
    drummerProfile: prisma.drummerProfile,
  };
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) also clears any queued `...Once`
  // implementations from a previous test — without it, an unconsumed
  // `mockResolvedValueOnce` can leak into and mis-sequence the next test.
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (t: unknown) => Promise<unknown>)(tx())
  );
});

describe('getDrummerProfile', () => {
  it('is null when there is no profile yet', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    expect(await getDrummerProfile(USER_ID)).toBeNull();
  });

  it('reads the bio as an empty string rather than null, and says when the name may change again', async () => {
    const now = new Date('2026-09-27T00:00:00Z');
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'ginger',
      bio: null,
      usernameChangedAt: new Date(now.getTime() - 10 * DAY_MS),
    } as never);

    const view = await getDrummerProfile(USER_ID);
    expect(view?.bio).toBe('');
    // nextChangeAt is derived from `new Date()`, so only its presence and
    // rough shape are checked here — see saveDrummerProfile below for the
    // exact-date assertions against an injected `now`.
    expect(typeof view?.nextChangeAt).toBe('string');
  });
});

describe('usernameOf', () => {
  it('is the username alone, or null', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({ username: 'ginger' } as never);
    expect(await usernameOf(USER_ID)).toBe('ginger');

    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    expect(await usernameOf(USER_ID)).toBeNull();
  });
});

describe('usernameAvailability', () => {
  it('answers "shape" without ever asking the database', async () => {
    const answer = await usernameAvailability('ab', USER_ID);
    expect(answer).toEqual({ available: false, reason: 'shape', message: USERNAME_MESSAGES.shape });
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the shape check short-circuits
  });

  it('answers "unavailable" for a reserved word, without asking the database', async () => {
    const answer = await usernameAvailability('admin', USER_ID);
    expect(answer).toEqual({
      available: false,
      reason: 'unavailable',
      message: USERNAME_MESSAGES.unavailable,
    });
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the word check short-circuits
  });

  it('is available when nobody holds it', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);
    expect(await usernameAvailability('ginger_baker', USER_ID)).toEqual({ available: true });
  });

  it('is available to the caller who already has it', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({ userId: USER_ID } as never);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);
    expect(await usernameAvailability('ginger_baker', USER_ID)).toEqual({ available: true });
  });

  it('is "taken" when someone else holds it', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      userId: 'someone-else',
    } as never);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);
    expect(await usernameAvailability('ginger_baker', USER_ID)).toEqual({
      available: false,
      reason: 'taken',
      message: USERNAME_MESSAGES.taken,
    });
  });

  it('is "taken" — not "unavailable" — while a released name is still on hold', async () => {
    const now = new Date('2026-09-27T00:00:00Z');
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue({
      heldUntil: new Date(now.getTime() + DAY_MS),
    } as never);
    expect(await usernameAvailability('ginger_baker', USER_ID, now)).toEqual({
      available: false,
      reason: 'taken',
      message: USERNAME_MESSAGES.taken,
    });
  });

  it('is free once the hold has lapsed', async () => {
    const now = new Date('2026-09-27T00:00:00Z');
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue({
      heldUntil: new Date(now.getTime() - DAY_MS),
    } as never);
    expect(await usernameAvailability('ginger_baker', USER_ID, now)).toEqual({ available: true });
  });
});

describe('saveDrummerProfile', () => {
  it('creates a profile on the first choice, without touching usernameChangedAt', async () => {
    vi.mocked(prisma.drummerProfile.findUnique)
      .mockResolvedValueOnce(null) // `current`
      .mockResolvedValueOnce(null); // usernameAvailability's holder check
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.drummerProfile.create).mockResolvedValue({
      username: 'ginger_baker',
      bio: 'Hi',
      usernameChangedAt: null,
    } as never);

    const view = await saveDrummerProfile(USER_ID, { username: 'Ginger_Baker', bio: 'Hi' });

    expect(view).toEqual({ username: 'ginger_baker', bio: 'Hi', nextChangeAt: null });
    expect(vi.mocked(prisma.drummerProfile.create).mock.calls[0][0]).toEqual({
      data: { userId: USER_ID, username: 'ginger_baker', bio: 'Hi' },
    });
    expect(prisma.drummerProfile.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a first choice is a create
  });

  it('lets a bio-only save through without counting it as a username change', async () => {
    const now = new Date('2026-09-27T00:00:00Z');
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'ginger_baker',
      bio: 'Old bio',
      usernameChangedAt: now,
    } as never);
    vi.mocked(prisma.drummerProfile.update).mockResolvedValue({
      username: 'ginger_baker',
      bio: 'New bio',
      usernameChangedAt: now,
    } as never);

    await saveDrummerProfile(USER_ID, { username: 'ginger_baker', bio: 'New bio' }, now);

    // same name as before: not a change, so no availability check and no hold
    expect(prisma.reservedUsername.upsert).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no change to hold against
    expect(vi.mocked(prisma.drummerProfile.update).mock.calls[0][0]).toEqual({
      where: { userId: USER_ID },
      data: { bio: 'New bio' },
    });
  });

  it('refuses a change inside the 30-day window with a 409 naming the date it may change again', async () => {
    const changedAt = new Date('2026-09-10T00:00:00Z');
    const now = new Date('2026-09-27T00:00:00Z'); // 17 days later, inside the 30-day window
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'ginger_baker',
      bio: '',
      usernameChangedAt: changedAt,
    } as never);

    await expect(saveDrummerProfile(USER_ID, { username: 'new_name' }, now)).rejects.toThrow(
      ConflictError
    );
    await expect(saveDrummerProfile(USER_ID, { username: 'new_name' }, now)).rejects.toThrow(
      '2026-10-10'
    ); // changedAt + 30 days
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('changes the name after 30 days, holding the old one and stamping usernameChangedAt', async () => {
    const changedAt = new Date('2026-08-01T00:00:00Z');
    const now = new Date('2026-09-27T00:00:00Z'); // well past 30 days
    vi.mocked(prisma.drummerProfile.findUnique)
      .mockResolvedValueOnce({
        username: 'old_name',
        bio: 'Bio',
        usernameChangedAt: changedAt,
      } as never) // current
      .mockResolvedValueOnce(null); // usernameAvailability's holder check — nobody has "new_name"
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.drummerProfile.update).mockResolvedValue({
      username: 'new_name',
      bio: 'Bio',
      usernameChangedAt: now,
    } as never);

    await saveDrummerProfile(USER_ID, { username: 'New_Name' }, now);

    expect(vi.mocked(prisma.reservedUsername.upsert).mock.calls[0][0]).toMatchObject({
      where: { username: 'old_name' },
      create: { username: 'old_name', heldUntil: new Date(now.getTime() + 30 * DAY_MS) },
      update: { heldUntil: new Date(now.getTime() + 30 * DAY_MS) },
    });
    expect(vi.mocked(prisma.drummerProfile.update).mock.calls[0][0]).toEqual({
      where: { userId: USER_ID },
      data: { username: 'new_name', usernameChangedAt: now },
    });
  });

  it('refuses a name that is taken with a 409, before ever opening a transaction', async () => {
    vi.mocked(prisma.drummerProfile.findUnique)
      .mockResolvedValueOnce(null) // current
      .mockResolvedValueOnce({ userId: 'someone-else' } as never); // holder
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);

    await expect(saveDrummerProfile(USER_ID, { username: 'taken_name' })).rejects.toThrow(
      ConflictError
    );
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('clears a lapsed hold as the name is claimed', async () => {
    const now = new Date('2026-09-27T00:00:00Z');
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.drummerProfile.create).mockResolvedValue({
      username: 'freed_name',
      bio: null,
      usernameChangedAt: null,
    } as never);

    await saveDrummerProfile(USER_ID, { username: 'freed_name' }, now);

    expect(vi.mocked(prisma.reservedUsername.deleteMany).mock.calls[0][0]).toEqual({
      where: { username: 'freed_name', heldUntil: { lte: now } },
    });
  });

  it('turns a race at the database into the same 409 the pre-check gives', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.drummerProfile.create).mockRejectedValue({
      code: 'P2002',
      meta: { target: ['username'] },
    });

    await expect(saveDrummerProfile(USER_ID, { username: 'race_name' })).rejects.toThrow(
      ConflictError
    );
    await expect(saveDrummerProfile(USER_ID, { username: 'race_name' })).rejects.toThrow(
      USERNAME_MESSAGES.taken
    );
  });

  it('lets an unrelated database error through unchanged', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.reservedUsername.findUnique).mockResolvedValue(null);
    const boom = new Error('connection reset');
    vi.mocked(prisma.drummerProfile.create).mockRejectedValue(boom);

    await expect(saveDrummerProfile(USER_ID, { username: 'whatever' })).rejects.toBe(boom);
  });
});
