import { PUBLISHING_FLAG } from '@/lib/app/breaks/community/publish';
import type { SeedUnit } from '@/prisma/runner';

/**
 * The site-wide switch for publishing to the community library (Phase 6,
 * task 6.11), seeded **on** so a fresh install can publish.
 *
 * `isFeatureEnabled` reads a missing flag as off, so the switch fails closed:
 * an install that never ran this seed cannot publish until an admin creates
 * the flag. Turning it off in `/admin/features` stops new publications at
 * once; what is already published stays, and moderation still works.
 *
 * `update: {}` — re-running the seed never turns back on a switch an admin
 * turned off.
 */
const unit: SeedUnit = {
  name: 'app-beatbreaker/002-publishing-flag',
  async run({ prisma, logger }) {
    await prisma.featureFlag.upsert({
      where: { name: PUBLISHING_FLAG },
      update: {},
      create: {
        name: PUBLISHING_FLAG,
        description:
          'Publishing patterns to the BeatBreaker community library. Off stops new publications site-wide; published patterns stay.',
        enabled: true,
      },
    });
    logger.info(`✅ Feature flag ${PUBLISHING_FLAG} present`);
  },
};

export default unit;
