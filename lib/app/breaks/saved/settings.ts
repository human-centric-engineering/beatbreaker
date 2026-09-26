import { ValidationError } from '@/lib/api/errors';
import { listKits, listStyles } from '@/lib/app/breaks/catalogue/data';
import { kitIsPlayable } from '@/lib/app/breaks/kit';
import { yourKitKeys } from '@/lib/app/breaks/samples/kits';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';
import {
  CATALOGUE_FIELDS,
  DEFAULT_STUDIO_SETTINGS,
  type StudioSettings,
  type StudioSettingsField,
  type StudioSettingsPatch,
  parseStoredSettings,
} from '@/lib/validations/studio-settings';

/**
 * Your Studio settings (D19): one `StudioSettings` row per person.
 *
 * **Server-side only**, like `pins.ts` beside it.
 *
 * **Read field by field.** A stored value that no longer parses, or names a
 * kit or style the catalogue no longer has (a kit of yours you deleted
 * included), reads as its own default, and one
 * log line names the fields that did. The rest of the row is unaffected, so a
 * tightened bound never costs someone their tuning.
 *
 * **Written as a merge.** Each field in a patch replaces the stored one;
 * fields not in it are left alone, and tuning merges a level deeper, by kit.
 * The merge happens in one statement, so two devices saving different fields
 * at the same moment both land.
 */

/**
 * Which kit and style keys a setting may name: system kits that play, your own
 * kits (D20), and every style. Your kits are read per call, never from the
 * catalogue's shared memo, so another person's kit is never a valid answer.
 */
async function catalogueKeys(userId: string): Promise<Record<'kit' | 'style', Set<string>>> {
  const [kits, styles, yours] = await Promise.all([listKits(), listStyles(), yourKitKeys(userId)]);
  return {
    kit: new Set([...kits.filter(kitIsPlayable).map((k) => k.key), ...yours]),
    style: new Set(styles.map((s) => s.key)),
  };
}

const catalogueFields = Object.entries(CATALOGUE_FIELDS) as Array<
  [keyof typeof CATALOGUE_FIELDS, 'kit' | 'style']
>;

/** Your settings, with every field present — the default where you have never set one. */
export async function readStudioSettings(userId: string): Promise<StudioSettings> {
  const [row, keys] = await Promise.all([
    prisma.studioSettings.findUnique({ where: { userId }, select: { prefs: true } }),
    catalogueKeys(userId),
  ]);
  if (!row) return structuredClone(DEFAULT_STUDIO_SETTINGS);

  const { settings, invalid } = parseStoredSettings(row.prefs);
  const gone: StudioSettingsField[] = [];
  for (const [field, kind] of catalogueFields) {
    if (!keys[kind].has(settings[field])) {
      settings[field] = DEFAULT_STUDIO_SETTINGS[field];
      if (!invalid.includes(field)) gone.push(field);
    }
  }

  const fellBack = [...invalid, ...gone];
  if (fellBack.length) {
    logger.warn('BeatBreaker: stored Studio settings fell back to their defaults', {
      userId,
      fields: fellBack,
    });
  }
  return settings;
}

/**
 * Merge `patch` into your settings and answer the result.
 *
 * `patch` has already passed `studioSettingsPatchSchema`. What that schema
 * cannot check is whether a kit or style key exists, so that is refused here,
 * as a 400 naming the field, before anything is written.
 */
export async function updateStudioSettings(
  userId: string,
  patch: StudioSettingsPatch
): Promise<StudioSettings> {
  const named = catalogueFields.filter(([field]) => patch[field] !== undefined);
  if (named.length) {
    const keys = await catalogueKeys(userId);
    const errors = named
      .filter(([field, kind]) => !keys[kind].has(patch[field] ?? ''))
      .map(([field, kind]) => ({
        path: field,
        message: kind === 'kit' ? 'Not a kit you can play' : 'Not a style the Studio has',
      }));
    if (errors.length) throw new ValidationError('Invalid request body', { errors });
  }

  /* `||` on jsonb replaces the top-level keys the patch has and keeps the
     rest. A read-modify-write in Prisma would lose one of two concurrent
     patches; this cannot. `sound` goes one level deeper: the kits in the patch
     replace the stored ones and the other kits stay, so tuning one kit on one
     device does not put back another device's old tuning of a different kit.
     A kit reset is sent as that kit with no overrides (`{}`). A stored `sound`
     that is not an object starts again from empty.

     `updatedAt` is set by hand because `@updatedAt` is Prisma's, and this
     statement does not go through it. The tagged template binds `userId` and
     the JSON as parameters; nothing is interpolated. */
  const json = JSON.stringify(patch);
  await prisma.$executeRaw`
    INSERT INTO "studio_settings" ("userId", "prefs", "updatedAt")
    VALUES (${userId}, ${json}::jsonb, NOW())
    ON CONFLICT ("userId") DO UPDATE
      SET "prefs" = "studio_settings"."prefs" || EXCLUDED."prefs" || CASE
            WHEN EXCLUDED."prefs" ? 'sound' THEN jsonb_build_object(
              'sound',
              CASE
                WHEN jsonb_typeof("studio_settings"."prefs" -> 'sound') = 'object'
                THEN "studio_settings"."prefs" -> 'sound'
                ELSE '{}'::jsonb
              END || (EXCLUDED."prefs" -> 'sound')
            )
            ELSE '{}'::jsonb
          END,
          "updatedAt" = NOW()
  `;

  return readStudioSettings(userId);
}
