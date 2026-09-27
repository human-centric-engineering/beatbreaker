import { z } from 'zod';

import { normaliseForCheck, usernameIsBlocked } from '@/lib/app/breaks/community/words';

/**
 * The rules for a username (D3, task 6.2) — the one place they are written.
 *
 * 3–24 characters: letters, digits, `-` and `_`, starting with a letter or a
 * digit. Stored lower-case, so `Ginger_Baker` and `ginger_baker` are the same
 * name and the second person to try is told it is taken.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
/** How often a username may change, and how long the old one is held. */
export const USERNAME_CHANGE_DAYS = 30;
export const USERNAME_HOLD_DAYS = 30;

export const USERNAME_RULE = `${USERNAME_MIN}–${USERNAME_MAX} letters, numbers, - or _`;

const SHAPE = /^[a-z0-9][a-z0-9_-]*$/;

/**
 * Names nobody may take: the site's own addresses and roles, and words that
 * would read as speaking for BeatBreaker.
 */
const RESERVED = new Set([
  'about',
  'account',
  'admin',
  'administrator',
  'api',
  'app',
  'beatbreaker',
  'beatbuddy',
  'contact',
  'dashboard',
  'everyone',
  'explore',
  'help',
  'home',
  'login',
  'logout',
  'me',
  'mod',
  'moderator',
  'null',
  'official',
  'privacy',
  'profile',
  'root',
  'settings',
  'signup',
  'staff',
  'studio',
  'support',
  'system',
  'team',
  'terms',
  'undefined',
  'you',
]);

/**
 * Roles someone could impersonate by spelling them differently —
 * `4dm1n`, `the_admin`, `beat-breaker-official`. Checked after the disguises
 * are undone, and anywhere in the name.
 */
const LOOK_ALIKES = ['admin', 'beatbreaker', 'moderator', 'official', 'support'].map(
  normaliseForCheck
);

export type UsernameProblem = 'shape' | 'unavailable';

/**
 * What is wrong with a username, before asking the database whether it is
 * taken: `shape` (the characters or the length), `unavailable` (reserved, a
 * look-alike or a blocked word — one answer for all three, so the refusal does
 * not teach anyone the list), or null.
 */
export function usernameProblem(raw: string): UsernameProblem | null {
  const name = raw.trim().toLowerCase();
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX || !SHAPE.test(name)) {
    return 'shape';
  }
  if (RESERVED.has(name)) return 'unavailable';
  const flat = normaliseForCheck(name);
  if (LOOK_ALIKES.some((w) => flat.includes(w))) return 'unavailable';
  if (usernameIsBlocked(name)) return 'unavailable';
  return null;
}

/** What each answer says, in the words of site-copy §6. */
export const USERNAME_MESSAGES = {
  shape: `Use ${USERNAME_RULE}, starting with a letter or number.`,
  unavailable: "That username isn't available.",
  taken: "That one's taken. Try another.",
} as const;

/** A username as a request carries it: trimmed, folded, and held to the rules. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((name, ctx) => {
    const problem = usernameProblem(name);
    if (problem) ctx.addIssue({ code: 'custom', message: USERNAME_MESSAGES[problem] });
  });
