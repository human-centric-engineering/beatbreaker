/**
 * BeatBuddy — one turn, streamed (§6).
 *
 * POST /api/v1/buddy/stream — `{ message, doc, section?, conversationId?,
 * attachments? }` in; Sunrise's chat SSE stream out.
 *
 * Why the app owns this rather than using `/api/v1/chat/stream`: the consumer
 * route carries no per-message context, and BeatBuddy is useless without the
 * pattern on screen. Here the working document is validated with
 * `sharePayloadSchema` and written to the caller's `BuddyWorkspace` before the
 * model is called, so every tool in the turn reads the pattern the person is
 * looking at.
 *
 * - **The agent is pinned.** The body names no agent; the client cannot reach
 *   another one through this route.
 * - **The daily allowance (D4)** is checked before anything is written: a
 *   person past it gets a 429 with `BUDDY_ALLOWANCE_SPENT` and a sentence the
 *   drawer shows as it is.
 * - **Order matters.** Everything that can refuse a turn — the body, the agent,
 *   the allowance, the attachments — runs before the workspace write, so a
 *   refused turn leaves the workspace as it was and costs nothing.
 *
 * Authentication: any authenticated user. `proxy.ts` has applied the section
 * cap; the per-user and per-agent chat caps here are the same ones the
 * consumer chat route applies, so switching surfaces buys no extra turns.
 */

import { getRouteLogger } from '@/lib/api/context';
import { errorResponse } from '@/lib/api/responses';
import { sseResponse } from '@/lib/api/sse';
import { validateRequestBody } from '@/lib/api/validation';
import { BEATBUDDY_SLUG } from '@/lib/app/breaks/buddy/agent';
import { ALLOWANCE_SPENT_MESSAGE, readAllowance } from '@/lib/app/breaks/buddy/allowance';
import { openWorkspace } from '@/lib/app/breaks/buddy/workspace';
import { withAuth } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/client';
import { getRequestId, getVisitorId } from '@/lib/logging/context';
import { streamChat } from '@/lib/orchestration/chat';
import {
  agentChatLimiter,
  consumerChatLimiter,
  createRateLimitResponse,
  imageLimiter,
} from '@/lib/security/rate-limit';
import { validateImageMagicBytes, validatePdfMagicBytes } from '@/lib/storage/image';
import { type BuddyStreamRequest, buddyStreamRequestSchema } from '@/lib/validations/buddy';

/**
 * Whether every attachment's bytes are what its media type says. Same checks,
 * same 415, as the consumer chat route: a mislabelled file never reaches the
 * provider.
 */
function attachmentsAreGenuine(attachments: NonNullable<BuddyStreamRequest['attachments']>) {
  return attachments.every((attachment) => {
    const bytes = Buffer.from(attachment.data, 'base64');
    if (attachment.mediaType.startsWith('image/')) {
      const check = validateImageMagicBytes(bytes);
      return check.valid && check.detectedType === attachment.mediaType;
    }
    if (attachment.mediaType === 'application/pdf') return validatePdfMagicBytes(bytes);
    return true;
  });
}

export const POST = withAuth(
  async (request, session) => {
    const userId = session.user.id;
    const userLimit = consumerChatLimiter.check(userId);
    if (!userLimit.success) return createRateLimitResponse(userLimit);

    const log = await getRouteLogger(request);
    const body = await validateRequestBody(request, buddyStreamRequestSchema);

    const agent = await prisma.aiAgent.findFirst({
      where: { slug: BEATBUDDY_SLUG, isActive: true },
      select: { id: true, rateLimitRpm: true },
    });
    if (!agent) {
      log.warn('BeatBuddy agent missing or inactive');
      return errorResponse("BeatBuddy isn't available right now.", {
        code: 'BUDDY_UNAVAILABLE',
        status: 503,
      });
    }

    const agentLimit = agentChatLimiter.check(`${agent.id}:${userId}`, agent.rateLimitRpm);
    if (!agentLimit.success) return createRateLimitResponse(agentLimit);

    const allowance = await readAllowance(userId);
    if (allowance.remaining === 0) {
      log.info('BeatBuddy allowance spent', { used: allowance.used, limit: allowance.limit });
      return errorResponse(ALLOWANCE_SPENT_MESSAGE, {
        code: 'BUDDY_ALLOWANCE_SPENT',
        status: 429,
        details: { ...allowance },
      });
    }

    if (body.attachments && body.attachments.length > 0) {
      const attachmentLimit = imageLimiter.check(`image:user:${userId}`);
      if (!attachmentLimit.success) return createRateLimitResponse(attachmentLimit);

      if (!attachmentsAreGenuine(body.attachments)) {
        log.warn('BeatBuddy attachment failed its magic-byte check', {
          mediaTypes: body.attachments.map((a) => a.mediaType),
        });
        return errorResponse("That file isn't the kind of image or PDF it says it is.", {
          code: 'IMAGE_INVALID_TYPE',
          status: 415,
        });
      }
    }

    const workspace = await openWorkspace(userId, body.doc);

    log.info('BeatBuddy turn started', {
      conversationId: body.conversationId,
      rev: workspace.rev,
      turnsUsed: allowance.used + 1,
      attachments: body.attachments?.length ?? 0,
    });

    const events = streamChat({
      message: body.message,
      agentSlug: BEATBUDDY_SLUG,
      userId,
      conversationId: body.conversationId,
      attachments: body.attachments,
      contextType: 'studio',
      entityContext: { workspace: true, section: body.section },
      requestId: await getRequestId(),
      visitorId: await getVisitorId(),
      signal: request.signal,
    });

    return sseResponse(events, { signal: request.signal });
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        "The workspace, conversation, messages and allowance count are all keyed on the caller's own id; an existing conversation is found by id and caller together.",
    },
  }
);
