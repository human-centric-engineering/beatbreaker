import { columnsFromDoc } from '@/lib/app/breaks/columns';
import type { DirectVisibility } from '@/lib/app/breaks/community/sharing';
import { visibilityData } from '@/lib/app/breaks/community/sharing';
import type { CreateBreakInput } from '@/lib/validations/breaks';

/** The data one `prisma.break.create` writes. */
export type BreakCreateRow = {
  userId: string;
  title: string;
  description?: string;
  links: CreateBreakInput['links'];
  doc: CreateBreakInput['doc'];
  visibility: DirectVisibility;
  slug?: string;
} & Awaited<ReturnType<typeof columnsFromDoc>>['columns'];

/**
 * One create's row data — the owner from the caller, the columns from the
 * document. `withSlug` adds the visibility, and a fresh slug when it is a
 * link share, each time it is called: a retry after a slug clash must not
 * resend the slug that clashed.
 *
 * The one path a new `Break` row takes: `POST /api/v1/breaks` (single and
 * bulk) and BeatBuddy's `save_pattern` both build their rows here, so a
 * pattern saved by the assistant has exactly the columns one saved by the
 * Save button has.
 */
export async function breakCreateData(
  userId: string,
  input: CreateBreakInput
): Promise<{
  decoded: Awaited<ReturnType<typeof columnsFromDoc>>['decoded'];
  withSlug: () => BreakCreateRow;
}> {
  const { decoded, columns } = await columnsFromDoc(input.doc);
  const data = {
    userId,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    links: input.links,
    ...columns,
    doc: input.doc,
  };
  return {
    decoded,
    withSlug: () => ({ ...data, ...visibilityData({ slug: null }, input.visibility) }),
  };
}
