'use client';

import { X } from 'lucide-react';

import { useStudio } from '@/components/app/studio/studio-provider';
import { cn } from '@/lib/utils';

/**
 * The line of feedback under the Studio (E9), and the Undo or Dismiss on it.
 *
 * Two live regions, both always in the page so a screen reader is listening
 * before anything is said: confirmations are polite, errors interrupt. The
 * words are keyed on the notice, so saying the same thing twice is a new line
 * to a screen reader as well as a new timer.
 */
export function StudioToast() {
  const { notice, dismiss } = useStudio();
  const error = !!notice?.error;

  return (
    <div className={cn('toast', notice && 'show', error && 'error')}>
      <span role="status">
        {notice && !error ? <span key={notice.id}>{notice.message}</span> : null}
      </span>
      <span role="alert">
        {notice && error ? <span key={notice.id}>{notice.message}</span> : null}
      </span>
      {notice?.action ? (
        <button
          type="button"
          className="toast-btn"
          onClick={() => {
            notice.action?.run();
            dismiss();
          }}
        >
          {notice.action.label}
        </button>
      ) : null}
      {error ? (
        <button type="button" className="toast-btn icon" aria-label="Dismiss" onClick={dismiss}>
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
