import { z } from 'zod';

import { usernameSchema } from '@/lib/app/breaks/community/username';

/** How long "About you" may be. */
export const BIO_MAX = 280;

/**
 * `PUT /api/v1/drummer-profile`. The username is required — a profile is a
 * username — and held to the rules in `username.ts`; the bio is optional, and
 * an empty one clears it. No defaults, so a request that leaves the bio out
 * leaves it alone.
 */
export const drummerProfileSchema = z.object({
  username: usernameSchema,
  bio: z.string().trim().max(BIO_MAX, `Up to ${BIO_MAX} characters`).optional(),
});

/** `GET /api/v1/drummer-profile/available?username=`. The rules are applied by the handler, so a bad name is an answer, not a 400. */
export const usernameQuerySchema = z.object({
  username: z.string().trim().min(1).max(64),
});

export type DrummerProfileInput = z.infer<typeof drummerProfileSchema>;
