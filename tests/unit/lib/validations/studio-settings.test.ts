/**
 * The Studio settings schema (D19), apart from the route: the per-engine
 * tuning ranges and the field-by-field read of a stored row. The route test
 * (`tests/integration/api/v1/studio-settings`) covers the write refusals.
 */

import { describe, expect, it } from 'vitest';

import {
  DRIFT_PARAM_DEFS,
  MASTER_PARAM_DEFS,
  PARAM_DEFS,
  USER_PARAM_DEFS,
} from '@/lib/app/breaks/kit';
import {
  DEFAULT_STUDIO_SETTINGS,
  MAX_TUNED_KITS,
  STUDIO_SETTINGS_FIELDS,
  TUNING_RANGES,
  parseStoredSettings,
  studioSettingsSchema,
} from '@/lib/validations/studio-settings';

describe('DEFAULT_STUDIO_SETTINGS', () => {
  it('passes its own schema, so a new account reads back what it was given', () => {
    expect(studioSettingsSchema.safeParse(DEFAULT_STUDIO_SETTINGS).success).toBe(true);
  });

  it('has exactly the schema’s fields', () => {
    expect(Object.keys(DEFAULT_STUDIO_SETTINGS).sort()).toEqual(
      Object.keys(STUDIO_SETTINGS_FIELDS).sort()
    );
  });
});

describe('TUNING_RANGES', () => {
  it('spans every engine a mixable voice can run on', () => {
    // the snare: hertz on the synthesiser, 0–1 on a drum machine, speed on a sampled kit
    expect(TUNING_RANGES.s.tune).toEqual({ min: 0, max: PARAM_DEFS.s[0].max });
    expect(TUNING_RANGES.s.colour).toEqual({ min: 0, max: 1 });
    expect(TUNING_RANGES.s.rate).toEqual({
      min: USER_PARAM_DEFS[0].min,
      max: USER_PARAM_DEFS[0].max,
    });
    expect(Object.keys(TUNING_RANGES.s)).toEqual(
      expect.arrayContaining(DRIFT_PARAM_DEFS.map((d) => d.key))
    );
  });

  it('gives toms and percussion the synthesiser’s knobs only, which is all they ever run on', () => {
    expect(Object.keys(TUNING_RANGES.t).sort()).toEqual(PARAM_DEFS.t.map((d) => d.key).sort());
    expect(TUNING_RANGES.t.tune).toEqual({ min: 58, max: 150 });
    expect(TUNING_RANGES.p).not.toHaveProperty('rate');
  });

  it('holds the master chain to the Kit drawer’s own ranges', () => {
    expect(TUNING_RANGES.master).toEqual(
      Object.fromEntries(MASTER_PARAM_DEFS.map((d) => [d.key, { min: d.min, max: d.max }]))
    );
  });
});

describe('the tuning field', () => {
  const sound = STUDIO_SETTINGS_FIELDS.sound;

  it(`takes up to ${MAX_TUNED_KITS} kits, and refuses one more`, () => {
    const kits = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`kit${i}`, { k: { room: 0.5 } }]));

    expect(sound.safeParse(kits(MAX_TUNED_KITS)).success).toBe(true);
    expect(sound.safeParse(kits(MAX_TUNED_KITS + 1)).success).toBe(false);
  });

  it('takes the range’s own ends', () => {
    expect(sound.safeParse({ studio70: { master: { lp: 2500, drive: 2.6 } } }).success).toBe(true);
  });
});

describe('parseStoredSettings', () => {
  it('reads nothing stored as every default, with nothing to report', () => {
    expect(parseStoredSettings({})).toEqual({ settings: DEFAULT_STUDIO_SETTINGS, invalid: [] });
  });

  it.each([null, 'prefs', 42, ['countIn', 2]])(
    'reads a stored value that is not an object (%j) as every default',
    (raw) => {
      expect(parseStoredSettings(raw).settings).toEqual(DEFAULT_STUDIO_SETTINGS);
    }
  );

  it('keeps each good field and names each bad one, independently', () => {
    const { settings, invalid } = parseStoredSettings({
      countIn: 2,
      ceiling: 'fast',
      lanesMode: 'custom',
      customLanes: { toms: true, p9: 'cowbell' },
    });

    expect(settings.countIn).toBe(2);
    expect(settings.lanesMode).toBe('custom');
    expect(settings.ceiling).toBe(DEFAULT_STUDIO_SETTINGS.ceiling);
    expect(settings.customLanes).toEqual(DEFAULT_STUDIO_SETTINGS.customLanes);
    expect(invalid).toEqual(['ceiling', 'customLanes']);
  });

  it('does not hand back the defaults object itself, so a caller cannot change them by accident', () => {
    const { settings } = parseStoredSettings({});
    settings.customLanes.toms = true;
    settings.sound.studio70 = { k: { tune: 60 } };

    expect(DEFAULT_STUDIO_SETTINGS.customLanes).toEqual({ toms: false });
    expect(DEFAULT_STUDIO_SETTINGS.sound).toEqual({});
  });
});
