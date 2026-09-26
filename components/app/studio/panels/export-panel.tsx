'use client';

import { useState } from 'react';

import { DetailsForm } from '@/components/app/studio/details-form';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { midiFileName } from '@/lib/app/breaks/midi';

/**
 * Hand a file to the browser to save. An object URL rather than a data URL,
 * so the bytes are not copied into a string on the way, and let go of once
 * the click has had it.
 */
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExportPanel() {
  const c = useStudio();
  const { say } = c;
  const [codeIn, setCodeIn] = useState('');

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      say(`${label} copied`);
    } catch {
      say('Copy blocked — select the text manually', { error: true });
    }
  };

  return (
    <>
      <DetailsForm />
      <div className="card">
        <div className="card-hd">
          <h3>Links and files</h3>
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
              Both sections, the tempo, swing and the style — paste it to anyone.
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
                  if (!c.loadCode(codeIn)) say('That is not a BeatBreaker code', { error: true });
                }}
              >
                Load it
              </button>
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">
              MIDI{' '}
              <StudioHelp title="MIDI">
                GM drum map, one bar per bar, velocity-mapped ghosts. Swing and the style&apos;s
                off-grid feel are written into the tick positions, so the export drags where the
                playback drags. With one section on show, only that section is written.
                {c.midiPort ? (
                  <>
                    {' '}
                    MIDI out plays the same notes at the same velocities, at the moment the
                    transport scheduled them, so the port swings and drags exactly where the
                    speakers do. Mute a lane in the mixer and the port still plays it.
                  </>
                ) : null}
              </StudioHelp>
            </span>
            <div className="btnrow">
              <button
                type="button"
                className="mini"
                onClick={() => {
                  const file = c.midi();
                  if (!file) {
                    say('There is nothing in the arrangement to write', { error: true });
                    return;
                  }
                  const name = midiFileName(c.patterns.A?.name ?? '');
                  download(new Blob([new Uint8Array(file.bytes)], { type: 'audio/midi' }), name);
                  say(`Downloaded ${name}`);
                }}
              >
                Download .mid
              </button>
              <Toggle
                pressed={!!c.midiPort}
                onPressedChange={(on) => {
                  if (!on) {
                    c.closeMidiOut();
                    say('MIDI out closed');
                    return;
                  }
                  void c
                    .openMidiOut()
                    .then((err) => (err ? say(err, { error: true }) : say('MIDI out open')));
                }}
              >
                MIDI out
              </Toggle>
            </div>
            {c.midiPort ? (
              <div className="hint">
                Playback is also driving <b>{c.midiPort}</b>, muted lanes too.
              </div>
            ) : null}
          </div>

          <div className="field">
            <span className="fieldlab">
              Print{' '}
              <StudioHelp title="Print">
                Prints just the chart, exactly as it is set above it — the counting guide, the
                sticking row and the size all come out with it. ⌘P or Ctrl+P does the same.
              </StudioHelp>
            </span>
            <div className="btnrow">
              <button type="button" className="mini" onClick={() => window.print()}>
                Print chart
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
