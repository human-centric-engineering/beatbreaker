import { z } from 'zod';

import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { cuidSchema } from '@/lib/validations/common';
import { chatAttachmentsArraySchema } from '@/lib/validations/orchestration';

/**
 * Request schema for `POST /api/v1/buddy/stream` — one BeatBuddy turn (§6).
 *
 * **What is not here is the point.** No agent slug: the route pins BeatBuddy.
 * No user id: it comes from the session. No `scope`, `contextType` or
 * `entityContext`: the route builds those itself. The client sends what it
 * owns — the message, the pattern on screen, which section it is showing —
 * and nothing that picks what the server acts on.
 */

/** A drummer's message is a sentence or two; this leaves room for a pasted bar or ten. */
export const MAX_BUDDY_MESSAGE_CHARS = 4000;

export const buddyStreamRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(MAX_BUDDY_MESSAGE_CHARS, `Keep it under ${MAX_BUDDY_MESSAGE_CHARS} characters`),

  /**
   * The pattern open in the Studio, in wire form. Held to the same schema a
   * shared link is, so a document the Studio could not have made never
   * reaches the workspace, the tools or the model.
   */
  doc: sharePayloadSchema,

  /** The section on screen, so "bar 2" means the bar the person is looking at. */
  section: z.enum(['A', 'B']).default('A'),

  /** Carry on an existing BeatBuddy conversation; absent starts a new one. */
  conversationId: cuidSchema.optional(),

  /** Photos (or PDFs) of notation for BeatBuddy to transcribe. */
  attachments: chatAttachmentsArraySchema.optional(),
});

export type BuddyStreamRequest = z.infer<typeof buddyStreamRequestSchema>;
