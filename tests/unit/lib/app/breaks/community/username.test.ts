/**
 * The username rules (D3, task 6.2): shape, length, reserved words,
 * look-alikes and blocked words — the one place they are checked before the
 * database is ever asked.
 *
 * @see lib/app/breaks/community/username.ts
 */

import { describe, expect, it } from 'vitest';

import {
  USERNAME_MAX,
  USERNAME_MESSAGES,
  USERNAME_MIN,
  usernameProblem,
  usernameSchema,
} from '@/lib/app/breaks/community/username';

describe('usernameProblem', () => {
  it('accepts a plain name at the shape the rule describes', () => {
    expect(usernameProblem('ginger_baker')).toBeNull();
    expect(usernameProblem('stewart-copeland')).toBeNull();
    expect(usernameProblem('drummer99')).toBeNull();
  });

  it('folds case before judging it, so the same name reads as the same problem', () => {
    expect(usernameProblem('Ginger_Baker')).toBeNull();
    expect(usernameProblem('ADMIN')).toBe('unavailable');
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(USERNAME_MAX + 1)],
    ['starts with a separator', '-ginger'],
    ['starts with an underscore', '_ginger'],
    ['has a space', 'ginger baker'],
    ['has a character outside the shape', 'ginger!'],
  ])('reports "shape" for a name that is %s', (_label, name) => {
    expect(usernameProblem(name)).toBe('shape');
  });

  it('accepts exactly the minimum and maximum lengths', () => {
    expect(usernameProblem('a'.repeat(USERNAME_MIN))).toBeNull();
    expect(usernameProblem('a'.repeat(USERNAME_MAX))).toBeNull();
  });

  it.each(['admin', 'explore', 'settings', 'root', 'support'])(
    'reports "unavailable" for the reserved word %s',
    (name) => {
      expect(usernameProblem(name)).toBe('unavailable');
    }
  );

  it.each(['4dm1n', 'the_admin', 'beat-breaker-official', 'th3-m0derator'])(
    'reports "unavailable" for the look-alike %s',
    (name) => {
      expect(usernameProblem(name)).toBe('unavailable');
    }
  );

  it('reports "unavailable" for a name that carries a blocked word', () => {
    expect(usernameProblem('fuckyeah')).toBe('unavailable');
    // disguised, the way words.ts documents
    expect(usernameProblem('sh1t-drummer')).toBe('unavailable');
  });

  it('does not flag an ordinary name that merely contains letters found in the blocked list', () => {
    // "assassin" contains no blocked word or look-alike as a substring
    expect(usernameProblem('assassin')).toBeNull();
  });
});

describe('usernameSchema', () => {
  it('trims and lower-cases what it keeps', () => {
    expect(usernameSchema.parse('  Ginger_Baker  ')).toBe('ginger_baker');
  });

  it('carries the shape message for a name that fails the shape check', () => {
    const result = usernameSchema.safeParse('ab');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(USERNAME_MESSAGES.shape);
    }
  });

  it('carries the unavailable message for a reserved word, without naming which rule fired', () => {
    const result = usernameSchema.safeParse('admin');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(USERNAME_MESSAGES.unavailable);
    }
  });

  it('passes a name with no problem straight through', () => {
    const result = usernameSchema.safeParse('Cold_Carpet-9');
    expect(result).toMatchObject({ success: true, data: 'cold_carpet-9' });
  });
});
