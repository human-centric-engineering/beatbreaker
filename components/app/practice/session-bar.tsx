'use client';

import Link from 'next/link';

import { useStudio } from '@/components/app/studio/studio-provider';
import { layerName } from '@/lib/app/breaks/layers';
import { elapsed, slotSeconds } from '@/lib/app/practice/runner';

/** Minutes and seconds, as a clock shows them. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The practice session's bar above the stage (Phase 7D, task 7D.9): its name,
 * "Pattern 2 of 5", the time left in this slot, and the tempo now → the
 * target, with _Start_, _Pause_ / _Resume_, _Skip_, _+1 min_ and _Stop_. At
 * the end of a slot it offers to record the tempo reached (7D.10).
 *
 * Everything it shows is the runner's state (`useSessionRun`); it decides
 * nothing itself.
 */
export function SessionBar() {
  const { sessionRun: s } = useStudio();
  if (!s) return null;
  const { session, run, items, now, prompt } = s;
  const phase = run?.phase ?? null;
  /** The run while it is going; null before Start and once it is done. */
  const live = run && run.phase !== 'done' ? run : null;
  const current = live && live.index >= 0 ? items[live.index] : null;
  const plan = current?.plan ?? null;
  const left = live && plan ? slotSeconds(live, items) - elapsed(live, now) : 0;
  const active = live !== null;

  return (
    <section className="session-bar" aria-label={`Practice session: ${session.name}`}>
      <div className="session-head">
        <b>{session.name}</b>
        {live && current && plan ? (
          <span aria-live="polite">
            Pattern {live.index + 1} of {items.length} · {current.title} ·{' '}
            {layerName(current.level)}
          </span>
        ) : run?.phase === 'done' ? (
          <span>
            Done — {run.played.length} {run.played.length === 1 ? 'pattern' : 'patterns'} played
          </span>
        ) : (
          <span>
            {items.length} {items.length === 1 ? 'pattern' : 'patterns'} · {session.totalMinutes}{' '}
            min
          </span>
        )}
      </div>

      {live && plan ? (
        <div className="session-read">
          <span className="mono" aria-label="Time left in this pattern">
            {phase === 'loading' || phase === 'counting' ? 'Count-in' : clock(left)}
          </span>
          <span className="mono" aria-label="Tempo now and target">
            {live.bpm} → {plan.targetBpm} bpm
          </span>
        </div>
      ) : null}

      <div className="session-controls">
        {!active ? (
          <button type="button" className="mini on" onClick={s.start} disabled={!items.length}>
            {phase === 'done' ? 'Run it again' : 'Start'}
          </button>
        ) : (
          <>
            {phase === 'paused' ? (
              <button type="button" className="mini on" onClick={s.resume}>
                Resume
              </button>
            ) : (
              <button type="button" className="mini" onClick={s.pause}>
                Pause
              </button>
            )}
            <button type="button" className="mini" onClick={s.skip}>
              Skip
            </button>
            <button type="button" className="mini" onClick={s.addMinute}>
              +1 min
            </button>
            <button type="button" className="mini" onClick={s.stop}>
              Stop
            </button>
          </>
        )}
        <Link className="mini ghost" href={`/practice/${session.id}`}>
          Edit session
        </Link>
      </div>

      {prompt ? (
        <div className="session-prompt" role="status">
          <span>
            Played “{prompt.result.title}” well at {prompt.result.reachedBpm}?
          </span>
          <button type="button" className="mini on" onClick={() => void s.record()}>
            Record it
          </button>
          <button type="button" className="mini ghost" onClick={s.dismissPrompt}>
            Not now
          </button>
        </div>
      ) : null}
    </section>
  );
}
