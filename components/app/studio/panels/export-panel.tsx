'use client';

import { useState } from 'react';

import { DetailsForm } from '@/components/app/studio/details-form';
import { useStudio } from '@/components/app/studio/studio-provider';
import { cn } from '@/lib/utils';

export function ExportPanel() {
  const c = useStudio();
  const { say } = c;
  const [codeIn, setCodeIn] = useState('');

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      say(`${label} copied`);
    } catch {
      say('Copy blocked — select the text manually');
    }
  };

  return (
    <>
      <DetailsForm />
      <div className="card">
        <div className="card-hd">
          <h3>Take it away</h3>
        </div>
        <div className="card-bd">
          <div className="field">
            <span className="fieldlab">Share this break</span>
            <div className="btnrow">
              <button
                type="button"
                className="mini"
                onClick={() => void copy(c.shareCode(), 'Break code')}
              >
                Copy break code
              </button>
              <button
                type="button"
                className="mini"
                onClick={() => void copy(c.shareLink(), 'Link')}
              >
                Copy link
              </button>
            </div>
            <div className="hint">
              The code carries both sections, the tempo, swing and the style — paste it to anyone.
            </div>
          </div>

          <div className="field">
            <label htmlFor="bb-import">Load a break code</label>
            <textarea
              id="bb-import"
              rows={3}
              value={codeIn}
              onChange={(e) => setCodeIn(e.target.value)}
              placeholder="Paste a BeatBreaker code here…"
            />
            <div className="btnrow">
              <button
                type="button"
                className="mini"
                onClick={() => {
                  // "Break loaded" is said when it loads — it may wait on the unsaved-changes prompt
                  if (!c.loadCode(codeIn)) say('That is not a BeatBreaker code');
                }}
              >
                Load it
              </button>
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">MIDI</span>
            <div className="btnrow">
              <button
                type="button"
                className="mini"
                onClick={() => void copy(c.midiBase64(), 'MIDI')}
              >
                Copy MIDI (base64)
              </button>
              <button
                type="button"
                className={cn('mini', c.midiPort && 'on')}
                onClick={() => {
                  if (c.midiPort) {
                    c.closeMidiOut();
                    say('MIDI out closed');
                    return;
                  }
                  void c.openMidiOut().then((err) => say(err || 'MIDI out open'));
                }}
              >
                {c.midiPort ? `MIDI out: ${c.midiPort}` : 'MIDI out…'}
              </button>
            </div>
            {c.midiPort ? (
              <div className="hint">
                Playback is also driving <b>{c.midiPort}</b>, on the GM drum map — the same notes at
                the same velocities, at the moment the transport scheduled them, so the port swings
                and drags exactly where the speakers do. Mute a lane in the mixer and the port still
                plays it.
              </div>
            ) : null}
            <div className="hint">
              GM drum map, one bar per bar, velocity-mapped ghosts. Swing and the style&apos;s
              off-grid feel are written into the tick positions, so the export drags where the
              playback drags. <code>base64 -d &gt; break.mid</code> in a terminal.
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">Print</span>
            <div className="hint">
              ⌘P prints just the chart, exactly as it is set above it — the counting guide, the
              sticking row and the size all come out with it.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
