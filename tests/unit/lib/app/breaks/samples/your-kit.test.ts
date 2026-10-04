/**
 * Your kits in the Studio's catalogue (D20): added per person, under their own
 * heading, never over a catalogue kit.
 */

import { describe, expect, it } from 'vitest';

import { kitIsPlayable } from '@/lib/app/breaks/kit';
import { withYourKits, yourKitToCatalogue } from '@/lib/app/breaks/samples/your-kit';
import { kitParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
import { testCatalogue, testKit } from '@/tests/helpers/catalogue';
import type { YourKitView } from '@/lib/validations/samples';

const MINE: YourKitView = {
  id: 'ckit00000000000000000001',
  key: 'yours-abc',
  label: 'Garage kit',
  slots: {
    k: { sampleId: 'csmp00000000000000000001', name: 'kick.mp3', audioUrl: '/x' },
  },
};

describe('yourKitToCatalogue', () => {
  it('is a playable kit on your engine, each slot naming its sample by id', () => {
    const kit = yourKitToCatalogue(MINE);

    expect(kit).toMatchObject({ key: 'yours-abc', label: 'Garage kit', engine: 'user' });
    expect(kitIsPlayable(kit)).toBe(true);
    expect(kit.samples.slots).toEqual({ k: { v: null, files: ['csmp00000000000000000001'] } });
    // the numbers a kit row may hold
    expect(kitParamsSchema.safeParse(kit).success).toBe(true);
  });

  it('plays a piece from its folder, with each slot’s settings and the kit’s pans and numbers (9-v)', () => {
    const copied = testKit('bigrusty');
    const kit = yourKitToCatalogue({
      ...MINE,
      slots: {
        k: { ...MINE.slots.k, level: 0.8 },
        s: {
          piece: 'bigrusty-s',
          label: 'Big Rusty · Snare',
          spec: { layers: [{ v: 1, files: ['s-0-0.m4a'] }], trim: 1.6, folder: 'bigrusty' },
          tune: -100,
          decay: 0.5,
        },
      },
      pan: { s: 0.2 },
      params: { ...copied, pack: undefined },
    });

    expect(kit.samples).toEqual({
      slots: {
        k: { v: null, files: ['csmp00000000000000000001'], level: 0.8 },
        s: {
          layers: [{ v: 1, files: ['s-0-0.m4a'] }],
          trim: 1.6,
          folder: 'bigrusty',
          tune: -100,
          decay: 0.5,
        },
      },
      pan: { s: 0.2 },
    });
    // a copy of Big Rusty keeps Big Rusty's master chain, and stays your kit
    expect(kit.master).toEqual(copied.master);
    expect(kit).toMatchObject({ engine: 'user', key: 'yours-abc' });
  });
});

describe('withYourKits', () => {
  it('adds your kits under their own heading at the end, and changes nothing else', () => {
    const catalogue = testCatalogue();
    const merged = withYourKits(catalogue, [MINE]);

    expect(merged.kits['yours-abc']?.label).toBe('Garage kit');
    expect(merged.kitGroups.at(-1)).toEqual({ label: 'Your kits', keys: ['yours-abc'] });
    expect(merged.kitGroups.slice(0, -1)).toEqual(catalogue.kitGroups);
    for (const key of Object.keys(catalogue.kits))
      expect(merged.kits[key]).toBe(catalogue.kits[key]);
    expect(merged.styles).toBe(catalogue.styles);
  });

  it('hands back the catalogue itself when you have no kits', () => {
    const catalogue = testCatalogue();
    expect(withYourKits(catalogue, [])).toBe(catalogue);
  });
});
