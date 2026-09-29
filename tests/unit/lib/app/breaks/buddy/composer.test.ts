/** The composer's reading of a message before it is sent (§6, _Reading patterns in_). */

import { describe, expect, it } from 'vitest';

import {
  describeImported,
  findImportLink,
  importNote,
  isMidiFile,
} from '@/lib/app/breaks/buddy/composer';
import { funkPayload } from '@/tests/helpers/buddy';

describe('findImportLink', () => {
  it('finds a Groove Scribe link inside a sentence, without its trailing punctuation', () => {
    const link = 'https://www.mikeslessons.com/groove/?TimeSig=4/4&Div=16&H=|xxxxxxxxxxxxxxxx|';
    expect(findImportLink(`can you tidy ${link}.`)).toBe(link);
  });

  it('finds a BeatBreaker #b= link', () => {
    expect(findImportLink('this one https://beatbreaker.app/studio#b=eyJ2ZXIiOjR9 please')).toBe(
      'https://beatbreaker.app/studio#b=eyJ2ZXIiOjR9'
    );
  });

  it('leaves /p/ links, other sites and plain text alone', () => {
    expect(findImportLink('open https://beatbreaker.app/p/abc123xy')).toBeNull();
    expect(findImportLink('see https://example.com/drums')).toBeNull();
    expect(findImportLink('make it swing more')).toBeNull();
  });
});

describe('isMidiFile', () => {
  it('knows a MIDI file by type or by name', () => {
    expect(isMidiFile({ name: 'x', type: 'audio/midi' })).toBe(true);
    expect(isMidiFile({ name: 'groove.MID', type: '' })).toBe(true);
    expect(isMidiFile({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(false);
  });
});

describe('describeImported / importNote', () => {
  it('says how many bars, the meter and the tempo', () => {
    const doc = funkPayload();
    expect(describeImported(doc)).toBe('2 bars of 4/4 at 94 bpm');
    expect(importNote('groove.mid', doc)).toBe(
      '(I opened groove.mid in the Studio: 2 bars of 4/4 at 94 bpm.)'
    );
  });
});
