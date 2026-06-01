import { prisma } from '@/lib/db/client';

// Cooperative single-writer lock for the Document Clean Up co-authoring
// surface. Held by either an admin actively editing in the cleanup UI or
// (transiently) by a cleanup capability about to mutate processedContent.
//
// Same-user re-acquire succeeds (tab-to-tab is fine for one admin). A
// different user is blocked for LOCK_TTL_MS; after that the lock is treated
// as expired and may be taken over. No background sweeper — TTL is enforced
// at read time only, so a held-but-expired row is harmless until the next
// acquireEditLock or requireEditableTarget call.

export const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface LockState {
  heldBy: string | null;
  acquiredAt: Date | null;
  /** True when heldBy is set AND acquiredAt is within LOCK_TTL_MS. */
  active: boolean;
}

export interface LockAcquireResult {
  acquired: boolean;
  /** Populated when acquired=false — the user currently holding the lock. */
  heldBy?: string;
  /** Populated when acquired=true — when the lock was (re)acquired. */
  acquiredAt?: Date;
}

export interface RequireResult {
  ok: boolean;
  /** Populated when ok=false — the user currently holding the lock. */
  heldBy?: string;
}

function isActive(acquiredAt: Date | null, now: number): boolean {
  if (acquiredAt === null) return false;
  return now - acquiredAt.getTime() < LOCK_TTL_MS;
}

export async function getEditLockState(documentId: string): Promise<LockState> {
  const row = await prisma.aiKnowledgeDocument.findUnique({
    where: { id: documentId },
    select: { editLockHolder: true, editLockAcquiredAt: true },
  });
  if (!row) return { heldBy: null, acquiredAt: null, active: false };
  return {
    heldBy: row.editLockHolder,
    acquiredAt: row.editLockAcquiredAt,
    active: row.editLockHolder !== null && isActive(row.editLockAcquiredAt, Date.now()),
  };
}

export async function acquireEditLock(
  documentId: string,
  userId: string
): Promise<LockAcquireResult> {
  const state = await getEditLockState(documentId);
  if (state.active && state.heldBy !== userId) {
    return { acquired: false, heldBy: state.heldBy ?? undefined };
  }
  const now = new Date();
  await prisma.aiKnowledgeDocument.update({
    where: { id: documentId },
    data: { editLockHolder: userId, editLockAcquiredAt: now },
  });
  return { acquired: true, acquiredAt: now };
}

export async function releaseEditLock(documentId: string, userId: string): Promise<void> {
  // updateMany so a no-op (lock held by someone else, or already cleared)
  // doesn't throw — release should be idempotent on unmount.
  await prisma.aiKnowledgeDocument.updateMany({
    where: { id: documentId, editLockHolder: userId },
    data: { editLockHolder: null, editLockAcquiredAt: null },
  });
}

// Guard used by cleanup capabilities before any processedContent mutation.
// Allows the call when the lock is free, expired, or held by the caller.
// When held by a different user inside the TTL, refuses with the holder id.
//
// userId is the principal whose changes are about to land. For capabilities
// invoked from a chat session this is `context.userId` from
// CapabilityContext — the admin who owns the conversation.
export async function requireEditableTarget(
  documentId: string,
  userId: string | null
): Promise<RequireResult> {
  const state = await getEditLockState(documentId);
  if (!state.active) return { ok: true };
  if (state.heldBy === userId) return { ok: true };
  return { ok: false, heldBy: state.heldBy ?? undefined };
}
