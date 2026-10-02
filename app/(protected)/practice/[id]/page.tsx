import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SessionEditor } from '@/components/app/practice/session-editor';
import { readSession } from '@/lib/app/breaks/saved/sessions';
import { clearInvalidSession } from '@/lib/auth/clear-session';
import { getServerSession } from '@/lib/auth/utils';
import { cuidSchema } from '@/lib/validations/common';

/**
 * `/practice/[id]` — one of your practice sessions, in the editor (Phase 7D,
 * task 7D.5). Read through `readSession()`, as `GET
 * /api/v1/practice-sessions/:id` answers; someone else's session is the same
 * not-found as one that does not exist.
 */

export const metadata: Metadata = { title: 'Practice session' };

export default async function PracticeSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) clearInvalidSession(`/practice/${id}`);

  const parsed = cuidSchema.safeParse(id);
  if (!parsed.success) notFound();
  const practice = await readSession(session.user.id, parsed.data);
  if (!practice) notFound();

  return <SessionEditor initial={practice} />;
}
