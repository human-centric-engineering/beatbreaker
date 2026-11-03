import { describe, expect, it } from 'vitest';

import { ordinal } from '@/lib/app/ordinal';

describe('ordinal', () => {
  it('names a count as a place, the teens all th', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103, 111].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '103rd',
      '111th',
    ]);
  });
});
