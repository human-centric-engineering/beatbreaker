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
