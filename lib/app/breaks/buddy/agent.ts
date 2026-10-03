/**
 * BeatBuddy's agent slug. The stream route pins it, so the client cannot
 * address another agent; the `003-beatbuddy` seed creates the agent under it;
 * the daily allowance counts turns against it.
 */
export const BEATBUDDY_SLUG = 'beatbuddy';

/**
 * BeatBuddy's visibility (Phase 8, 8.1). People talk to it, but only through
 * the app's own stream route, which pins the slug and never reads
 * visibility. `public` or `invite_only` would also let Sunrise's generic
 * consumer chat route reach it, and that route doesn't apply the daily
 * allowance.
 */
export const BEATBUDDY_VISIBILITY = 'internal';
