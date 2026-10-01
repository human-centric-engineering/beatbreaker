/**
 * Why a pattern can be reported (Phase 6, task 6.10). Client-safe — the
 * report form reads these as well as the server.
 */
export const REPORT_REASONS = ['spam', 'not-theirs', 'offensive', 'bad-link', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** What each reason says, on the form and in the queue. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  'not-theirs': "Someone else's work passed off as theirs",
  offensive: 'Offensive title or description',
  'bad-link': 'Bad or misleading link',
  other: 'Something else',
};

/**
 * Why a drummer's profile can be reported (Phase 7B, task 7B.5): the pattern
 * reasons that make sense for a person's page. "Someone else's work" is about
 * a pattern, so it is not one of them.
 */
export const PROFILE_REPORT_REASONS = ['spam', 'offensive', 'bad-link', 'other'] as const;
export type ProfileReportReason = (typeof PROFILE_REPORT_REASONS)[number];

/** What each profile reason says, on the form and in the queue. */
export const PROFILE_REPORT_REASON_LABELS: Record<ProfileReportReason, string> = {
  spam: 'Spam',
  offensive: 'Offensive username or bio',
  'bad-link': 'Bad or misleading link',
  other: 'Something else',
};

/**
 * Why a row on a speed table can be reported (Phase 7C): the speed, the video
 * link beside it, or something else.
 */
export const SPEED_REPORT_REASONS = ['wrong-speed', 'bad-link', 'other'] as const;
export type SpeedReportReason = (typeof SPEED_REPORT_REASONS)[number];

/** What each speed reason says, on the form and in the queue. */
export const SPEED_REPORT_REASON_LABELS: Record<SpeedReportReason, string> = {
  'wrong-speed': "Speed doesn't look right",
  'bad-link': 'Bad or misleading link',
  other: 'Something else',
};
