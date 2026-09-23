'use client';

import { useStudio } from '@/components/app/studio/studio-provider';
import { DOCTOR_MOVES } from '@/lib/app/breaks/doctor';

export function DoctorPanel() {
  const c = useStudio();
  const { say } = c;

  return (
    <div className="card">
      <div className="card-hd">
        <h3>Break doctor</h3>
      </div>
      <div className="card-bd">
        <div className="hint" style={{ marginBottom: 12 }}>
          Musical edits applied to whichever section you are editing (<b>{c.editing}</b>). Each one
          re-runs the critic, so you can see whether the move helped.
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
            <button type="button" className="mini" onClick={c.undo} disabled={!c.canUndo}>
              ↶ Undo
            </button>
            <button type="button" className="mini" onClick={c.redo} disabled={!c.canRedo}>
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
  );
}
