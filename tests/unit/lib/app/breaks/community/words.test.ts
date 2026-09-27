/**
 * The word check for what goes public (tasks 6.2 and 6.9): undoing the usual
 * disguises, then checking a username by substring and free text word by
 * word.
 *
 * @see lib/app/breaks/community/words.ts
 */

import { describe, expect, it } from 'vitest';

import {
  normaliseForCheck,
  textIsBlocked,
  usernameIsBlocked,
} from '@/lib/app/breaks/community/words';

describe('normaliseForCheck', () => {
  it('lower-cases and strips separators', () => {
    expect(normaliseForCheck('F_u-c.k*you')).toBe('fuckyou');
  });

  it.each([
    ['0 as o', '0', 'o'],
    ['1 as i', '1', 'i'],
    ['l as i', 'l', 'i'],
    ['! as i', '!', 'i'],
    ['| as i', '|', 'i'],
    ['3 as e', '3', 'e'],
    ['4 as a', '4', 'a'],
    ['@ as a', '@', 'a'],
    ['5 as s', '5', 's'],
    ['$ as s', '$', 's'],
    ['7 as t', '7', 't'],
    ['8 as b', '8', 'b'],
  ])('maps %s', (_label, input, expected) => {
    expect(normaliseForCheck(input)).toBe(expected);
  });

  it('maps a whole disguised word to what it spells', () => {
    expect(normaliseForCheck('4dm1n')).toBe('admin'); // 4→a, 1→i — see username.test.ts for the real check
    expect(normaliseForCheck('sh1t')).toBe('shit');
    expect(normaliseForCheck('F_u_c_k')).toBe('fuck');
  });

  it('collapses runs of separators to nothing, not to one', () => {
    expect(normaliseForCheck('a___-- b')).toBe('ab');
  });
});

describe('usernameIsBlocked', () => {
  it('catches a blocked word as a plain substring anywhere in the name', () => {
    expect(usernameIsBlocked('xfuckx')).toBe(true);
    expect(usernameIsBlocked('imawhorehere')).toBe(true);
  });

  it('catches a disguised blocked word', () => {
    expect(usernameIsBlocked('sh1t-drummer')).toBe(true);
    expect(usernameIsBlocked('f_u_c_k')).toBe(true);
    expect(usernameIsBlocked('4dm1n')).toBe(false); // "admin" is not on the BLOCKED list itself
  });

  it('leaves an ordinary name alone', () => {
    expect(usernameIsBlocked('ginger_baker')).toBe(false);
    expect(usernameIsBlocked('drummer99')).toBe(false);
  });
});

describe('textIsBlocked', () => {
  it('is fine with a word that merely contains a blocked word as a substring', () => {
    // the canonical false positive a substring check would catch
    expect(textIsBlocked('Scunthorpe shuffle')).toBe(false);
  });

  it('catches a blocked word used as its own word', () => {
    expect(textIsBlocked('what the fuck is this groove')).toBe(true);
  });

  it('catches a plural or -ing form by the stem check', () => {
    expect(textIsBlocked('total shits about it')).toBe(true);
    expect(textIsBlocked('stop fucking around')).toBe(true);
  });

  it('leaves innocent text alone', () => {
    expect(textIsBlocked('A funky drum break at 96 bpm')).toBe(false);
  });

  it('catches a word disguised with digits standing in for letters', () => {
    // digits stay inside the word the splitter keeps together; `-` and `_`
    // are word separators here, so a hyphenated disguise splits into
    // single letters instead — this checks the disguise a title actually
    // carries as one token.
    expect(textIsBlocked('what a sh1t take')).toBe(true);
  });

  it('treats an empty string as unblocked', () => {
    expect(textIsBlocked('')).toBe(false);
  });
});
