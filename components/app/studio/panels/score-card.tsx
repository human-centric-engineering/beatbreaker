'use client';

import { meterHue } from '@/components/app/studio/panels/controls';
import { useStudio } from '@/components/app/studio/studio-provider';
import { cn } from '@/lib/utils';

/**
 * The critic's read of the break: the score, what it is made of, and the
 * playability checks.
 *
 * In Generate, beside what it judges, and in Edit, because every musical edit
 * re-runs it and the point of a move is whether the number went up. Only one
 * drawer opens at a time, so it has to be in both (Phase 5, 5.5). The footer
 * carries the number alone.
 */
export function ScoreCard() {
  const c = useStudio();
  return (
    <div className="card">
      <div className="card-hd">
        <h3>Score</h3>
        <div className="spacer" />
        {c.tries ? (
          <span className="chip">
            {c.tries.rejected}/{c.tries.tries} rejected
          </span>
        ) : null}
      </div>
      <div className="card-bd">
        <div className="score">
          <div className="scorenum mono">
            {c.report?.score ?? '–'}
            <small>/100</small>
          </div>
          <div className="meters">
            {c.report?.dims.map((d) => (
              <div className="meter" key={d.key}>
                <span>{d.key}</span>
                <div className="track">
                  <div
                    className="fill"
                    style={{
                      width: `${Math.round(d.v * 100)}%`,
                      background: meterHue(d.v),
                    }}
                  />
                </div>
                <em>{d.read}</em>
              </div>
            ))}
          </div>
        </div>
        <div className="verdict">{c.report?.verdict}</div>
        <div className="checks">
          {c.checks?.checks.map((k) => (
            <div key={k.label} className={cn('check', k.ok ? 'ok' : 'no')}>
              <i>{k.ok ? '✓' : '✕'}</i>
              <span>{k.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
