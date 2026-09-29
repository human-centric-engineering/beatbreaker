import { type SharePayload, storedPayloadSchema } from '@/lib/app/breaks/schema';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';

/**
 * BeatBuddy's workspace: the pattern the person has open, one
 * `BuddyWorkspace` row each (Phase 7, §6).
 *
 * **Server-side only.** The stream route writes it at the start of every turn
 * from the document the Studio sends; BeatBuddy's tools read and write it, so
 * a second tool call in a turn sees what the first one did.
 *
 * **Every function takes the user id from its caller, and every caller takes
 * it from the session or `CapabilityContext.userId`.** Nothing here accepts an
 * id a model or a request body chose, which is the whole of what keeps one
 * person's tools off another person's pattern.
 */

export interface Workspace {
  doc: SharePayload;
  /** Goes up by one on every write. */
  rev: number;
}

/**
 * The person's workspace, or null when they have none or it no longer reads.
 *
 * Read through `storedPayloadSchema`, as a saved break is: a row written under
 * looser rules is repaired rather than lost. One that cannot be repaired reads
 * as no workspace, and the next turn's write replaces it.
 */
export async function readWorkspace(userId: string): Promise<Workspace | null> {
  const row = await prisma.buddyWorkspace.findUnique({
    where: { userId },
    select: { doc: true, rev: true },
  });
  if (!row) return null;

  const parsed = storedPayloadSchema.safeParse(row.doc);
  if (!parsed.success) {
    logger.warn('BeatBuddy workspace does not parse; treating it as empty', {
      userId,
      issues: parsed.error.issues.length,
    });
    return null;
  }
  return { doc: parsed.data, rev: row.rev };
}

/**
 * Replace the workspace's document, if nobody has written it since `rev`.
 *
 * One conditional statement, so two tool calls racing on the same workspace
 * cannot both land: the loser gets null and says so, rather than silently
 * undoing the winner's change. Returns the new revision.
 *
 * The caller has already held `doc` to `sharePayloadSchema`.
 */
export async function writeWorkspace(
  userId: string,
  doc: SharePayload,
  rev: number
): Promise<Workspace | null> {
  const { count } = await prisma.buddyWorkspace.updateMany({
    where: { userId, rev },
    data: { doc, rev: { increment: 1 } },
  });
  return count === 1 ? { doc, rev: rev + 1 } : null;
}
