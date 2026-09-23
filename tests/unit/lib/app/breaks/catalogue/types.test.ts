import { describe, expect, it } from 'vitest';

import { libraryGroups, percussionSource } from '@/lib/app/breaks/catalogue/types';
import type { CatalogueKit, CatalogueLibrary } from '@/lib/app/breaks/catalogue/types';
import { testKit, testLibrary } from '@/tests/helpers/catalogue';

/**
 * The two derivations the catalogue does in the client rather than on the wire.
 *
 * Both are small, and both are the kind of small that is wrong in a way nothing
 * reports. `libraryGroups` runs on a value that is legitimately absent while the
 * catalogue is arriving; `percussionSource` replaced a hard-coded kit key with a
 * search, and a search that finds nothing is silence rather than an error.
 */

describe('libraryGroups', () => {
  it('groups entries under their headings, in library order', () => {
    const groups = libraryGroups(testLibrary());
    /* Order matters and is the rows' own — the picker reads top to bottom and
       an alphabetical sort here would silently reorder the famous breaks. */
    expect(groups[0][0]).toBe('Funk and the breaks');
    expect(groups.flatMap(([, entries]) => entries)).toHaveLength(47);
    // every entry lands in exactly one heading
    expect(new Set(groups.map(([heading]) => heading)).size).toBe(groups.length);
  });

  it('returns nothing for a library that is not there', () => {
    /* The Studio renders before its catalogue has a library in it — on a fresh
       install, or with the famous breaks unpublished. `library.entries` on an
       undefined library throws, and the panel is a blank drawer with a console
       error rather than an empty list. */
    expect(libraryGroups(undefined)).toEqual([]);
  });

  it('returns nothing for a library with no entries', () => {
    const empty: CatalogueLibrary = { key: 'k', title: 't', description: '', entries: [] };
    expect(libraryGroups(empty)).toEqual([]);
  });
});

describe('percussionSource', () => {
  const withPerc = (key: string, perc: Record<string, { v: null; files: string[] }>) =>
    ({
      ...testKit(key),
      pack: 'virtuosity',
      samples: { perc },
    }) as CatalogueKit;

  it('finds the kit that ships the shared percussion', () => {
    /* This replaced `PackSource.PERC_FROM = 'virtuosity'`. Percussion is
       deliberately not per kit — a tambourine over the Studio '70s set should be
       a tambourine — so exactly one row carries a `perc` map and every kit
       reaches it. Finding it by looking is what lets a fork ship a different
       set as data. */
    const kits = {
      studio70: testKit('studio70'),
      virtuosity: withPerc('virtuosity', { tamb: { v: null, files: ['tamb-0.mp3'] } }),
    };
    expect(percussionSource(kits)).toEqual({
      pack: 'virtuosity',
      slots: { tamb: { v: null, files: ['tamb-0.mp3'] } },
    });
  });

  it('is null when no kit ships one, rather than half-loading', () => {
    /* Every case below is a row that looks like it has percussion and does not.
       Each would otherwise reach `loadPerc` and decode nothing, and the symptom
       is a percussion lane that plays the synthesised voice with no explanation. */
    expect(percussionSource({ studio70: testKit('studio70') })).toBeNull();
    expect(percussionSource({})).toBeNull();
    // a perc map with no pack folder to load the files from
    expect(
      percussionSource({
        odd: {
          ...testKit('studio70'),
          pack: undefined,
          samples: { perc: { tamb: { v: null, files: ['a.mp3'] } } },
        },
      })
    ).toBeNull();
    // a pack folder and an empty perc map
    expect(percussionSource({ odd: withPerc('muldjord', {}) })).toBeNull();
  });

  it('takes the first one when two kits carry a set, which is the catalogue’s order', () => {
    /* Not arbitrary: `position` decides, so an admin can choose. Pinned because
       "the first one wins" is a decision somebody has to be able to act on. */
    const kits = {
      a: withPerc('virtuosity', { tamb: { v: null, files: ['a.mp3'] } }),
      b: withPerc('muldjord', { tamb: { v: null, files: ['b.mp3'] } }),
    };
    expect(percussionSource(kits)?.slots.tamb.files).toEqual(['a.mp3']);
  });
});
