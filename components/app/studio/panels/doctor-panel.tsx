'use client';

import { ScoreCard } from '@/components/app/studio/panels/score-card';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { DOCTOR_MOVES } from '@/lib/app/breaks/doctor';

export function DoctorPanel() {
  const c = useStudio();
  const { say } = c;

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <h3>Musical edits</h3>
        </div>
        <div className="card-bd">
          <div className="hint" style={{ marginBottom: 12 }}>
            Applied to section <b>{c.editing}</b>.{' '}
            <StudioHelp title="Musical edits">
              Each move is applied to the section you are editing, and re-runs the critic, so you
              can see whether it helped.
            </StudioHelp>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <span className="fieldlab">
              New take{' '}
              <StudioHelp title="Regenerate">
                Writes section {c.editing} again in the same style and song, at the same length and
                meter: a different variation, not a different style. Undo brings the old one back.
              </StudioHelp>
            </span>
            <div className="btnrow">
              <button
                type="button"
                className="mini"
                onClick={() =>
                  say(
                    c.regenerate()
                      ? `Section ${c.editing} regenerated — undo brings the old take back`
                      : `Section ${c.editing}'s style is not in the catalogue, so it cannot be regenerated`
                  )
                }
                disabled={!c.view[c.editing]}
              >
                ↻ Regenerate
              </button>
            </div>
          </div>
          <div className="btnrow">
            {DOCTOR_MOVES.map(({ move, label }) => (
              <button key={move} type="button" className="mini" onClick={() => c.applyDoctor(move)}>
                {label}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <span className="fieldlab">Undo history</span>
            <div className="btnrow">
              <button
                type="button"
                className="mini"
                onClick={c.undo}
                disabled={!c.canUndo}
                aria-keyshortcuts="Control+Z Meta+Z"
              >
                ↶ Undo
              </button>
              <button
                type="button"
                className="mini"
                onClick={c.redo}
                disabled={!c.canRedo}
                aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
              >
                ↷ Redo
              </button>
              <button
                type="button"
                className="mini ghost"
                onClick={() => {
                  c.clearSection();
                  say(`Section ${c.editing} cleared — undo brings it back`);
                }}
              >
                Clear section
              </button>
            </div>
          </div>
        </div>
      </div>
      <ScoreCard />
    </>
  );
}
