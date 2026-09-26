/**
 * Your kits in the Studio's catalogue (D20): added per person, under their own
 * heading, never over a catalogue kit.
 */

import { describe, expect, it } from 'vitest';

import { kitIsPlayable } from '@/lib/app/breaks/kit';
import { withYourKits, yourKitToCatalogue } from '@/lib/app/breaks/samples/your-kit';
import { kitParamsSchema } from '@/lib/app/breaks/catalogue/schemas';
import { testCatalogue } from '@/tests/helpers/catalogue';
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
