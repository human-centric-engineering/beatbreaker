/**
 * `?drawer=&tab=` and `?style=` — read from the URL, so every value is checked and anything
 * that is not a tool or a tab is dropped rather than trusted.
 *
 * @see components/app/shell/studio-address.ts
 */

import { describe, expect, it } from 'vitest';

import {
  readStudioDrawer,
  readStudioSong,
  readStudioStyle,
  studioDrawerHref,
  studioStyleHref,
} from '@/components/app/shell/studio-address';

describe('readStudioDrawer', () => {
  it('reads a tool, and a Patterns tab with it', () => {
    expect(readStudioDrawer({ drawer: 'kit' })).toEqual({ tool: 'kit' });
    expect(readStudioDrawer({ drawer: 'patterns', tab: 'libraries' })).toEqual({
      tool: 'patterns',
      tab: 'libraries',
    });
  });

  it('keeps the drawer and drops a tab that is not one', () => {
    expect(readStudioDrawer({ drawer: 'patterns', tab: 'secret' })).toEqual({ tool: 'patterns' });
  });

  it('drops a tab on any drawer but Patterns — only that drawer has tabs', () => {
    expect(readStudioDrawer({ drawer: 'kit', tab: 'libraries' })).toEqual({ tool: 'kit' });
  });

  it.each([
    ['nothing', {}],
    ['not a tool', { drawer: 'admin' }],
    ['repeated', { drawer: ['patterns', 'kit'] }],
    ['a tool name in the wrong case', { drawer: 'Patterns' }],
  ])('opens no drawer for %s', (_, query) => {
    expect(readStudioDrawer(query)).toBeUndefined();
  });
});

describe('studioDrawerHref', () => {
  it('builds the address the page reads back', () => {
    const href = studioDrawerHref({ tool: 'patterns', tab: 'libraries' });
    expect(href).toBe('/studio?drawer=patterns&tab=libraries');
    const q = new URL(href, 'https://x.test').searchParams;
    expect(readStudioDrawer({ drawer: q.get('drawer'), tab: q.get('tab') })).toEqual({
      tool: 'patterns',
      tab: 'libraries',
    });
  });

  it('leaves a tab off a drawer that has none', () => {
    expect(studioDrawerHref({ tool: 'kit', tab: 'libraries' })).toBe('/studio?drawer=kit');
  });
});

describe('readStudioStyle', () => {
  it('reads a well-formed style key', () => {
    expect(readStudioStyle({ style: 'funk' })).toBe('funk');
    expect(readStudioStyle({ style: 'jazz-waltz' })).toBe('jazz-waltz');
    expect(readStudioStyle({ style: 'tonywilliams' })).toBe('tonywilliams');
  });

  it('drops anything else: missing, repeated, upper case, odd characters, too long', () => {
    expect(readStudioStyle({})).toBeUndefined();
    expect(readStudioStyle({ style: ['funk', 'rock'] })).toBeUndefined();
    expect(readStudioStyle({ style: 'Funk' })).toBeUndefined();
    expect(readStudioStyle({ style: '-funk' })).toBeUndefined();
    expect(readStudioStyle({ style: 'funk/../x' })).toBeUndefined();
    expect(readStudioStyle({ style: '' })).toBeUndefined();
    expect(readStudioStyle({ style: 'a'.repeat(41) })).toBeUndefined();
    expect(readStudioStyle({ style: 'a'.repeat(40) })).toBe('a'.repeat(40));
  });
});

describe('studioStyleHref', () => {
  it('is the address readStudioStyle reads back', () => {
    const href = studioStyleHref('bonham');
    expect(href).toBe('/studio?style=bonham');
    const query = Object.fromEntries(new URL(href, 'http://x').searchParams);
    expect(readStudioStyle(query)).toBe('bonham');
  });
});

describe('readStudioSong', () => {
  it('reads a well-formed key given with a style', () => {
    expect(readStudioSong({ style: 'joyce', song: 'how-soon-is-now' })).toBe('how-soon-is-now');
  });

  it('is nothing without a (valid) style — a song means something only in a style', () => {
    expect(readStudioSong({ song: 'how-soon-is-now' })).toBeUndefined();
    expect(readStudioSong({ style: 'Not A Style!', song: 'how-soon-is-now' })).toBeUndefined();
  });

  it.each(['How-Soon', '-lead', 'a b', '../x', '', 'a'.repeat(81), 42, ['a']])(
    'drops a song that is not a key: %s',
    (song) => {
      expect(readStudioSong({ style: 'joyce', song })).toBeUndefined();
    }
  );
});

describe('studioStyleHref with a song', () => {
  it('adds the song, and reads back as the same style and song', () => {
    const href = studioStyleHref('joyce', 'how-soon-is-now');
    expect(href).toBe('/studio?style=joyce&song=how-soon-is-now');
    const query = Object.fromEntries(new URL(href, 'http://x').searchParams);
    expect(readStudioStyle(query)).toBe('joyce');
    expect(readStudioSong(query)).toBe('how-soon-is-now');
  });

  it('encodes what needs it', () => {
    expect(studioStyleHref('a', 'b&c')).toBe('/studio?style=a&song=b%26c');
  });
});
