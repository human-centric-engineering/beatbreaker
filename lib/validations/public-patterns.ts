import { z } from 'zod';

import {
  PUBLIC_PAGE_DEFAULT,
  PUBLIC_PAGE_MAX,
  TEMPO_BANDS,
} from '@/lib/app/breaks/community/public';
import { METER_KEYS } from '@/lib/app/breaks/meter';

/**
 * `GET /api/v1/public/patterns` and `/explore`'s search params — one schema,
 * so the page and the API filter the same way. Filters are filters, not
 * claims: a style nobody has published in is an empty page, not an error.
 */
export const publicListQuerySchema = z.object({
  style: z.string().trim().max(40).optional(),
  meter: z
    .string()
    .refine((s) => METER_KEYS.includes(s), 'unknown meter')
    .optional(),
  tempo: z.enum(Object.keys(TEMPO_BANDS) as [keyof typeof TEMPO_BANDS]).optional(),
  difficulty: z.coerce
    .number()
    .int()
    .refine((n): n is 1 | 2 | 3 => n === 1 || n === 2 || n === 3, 'difficulty is 1, 2 or 3')
    .optional(),
  sort: z.enum(['newest', 'saved']).default('newest'),
  limit: z.coerce.number().int().min(1).max(PUBLIC_PAGE_MAX).default(PUBLIC_PAGE_DEFAULT),
  cursor: z.string().max(40).optional(),
});

export type PublicListQueryInput = z.infer<typeof publicListQuerySchema>;

/**
 * `GET /api/v1/public/patterns/:slug/variations` and the Variations section on
 * `/p/[slug]` (7A): the library's order and paging, no filters.
 */
export const variationsQuerySchema = publicListQuerySchema.pick({
  sort: true,
  limit: true,
  cursor: true,
});

/**
 * Read a search-params-like record through the schema, dropping empty values
 * first — an HTML filter form sends `style=` for "any style". What does not
 * parse falls back to no filter, so a hand-edited URL shows the library
 * rather than an error page.
 */
/**
 * Search params as the schema should see them: the first value of each, and
 * none that is empty — an HTML filter form sends `meter=` for "any time
 * signature", and that is no filter, not a wrong one. Shared by the API and
 * `/explore` so the same URL means the same thing to both.
 */
export function nonEmptyParams(
  params: Record<string, string | string[] | undefined> | URLSearchParams
): Record<string, string> {
  const entries =
    params instanceof URLSearchParams ? [...params.entries()] : Object.entries(params);
  const flat: Record<string, string> = {};
  for (const [k, v] of entries) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value && !(k in flat)) flat[k] = value;
  }
  return flat;
}

export function readPublicListQuery(
  params: Record<string, string | string[] | undefined>
): PublicListQueryInput {
  const flat = nonEmptyParams(params);
  const parsed = publicListQuerySchema.safeParse(flat);
  if (parsed.success) return parsed.data;
  // drop the fields that failed, keep the rest
  const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])));
  return publicListQuerySchema.parse(
    Object.fromEntries(Object.entries(flat).filter(([k]) => !bad.has(k)))
  );
}
