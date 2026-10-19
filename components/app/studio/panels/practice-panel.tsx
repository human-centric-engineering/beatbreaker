'use client';

import { countInLabel, useTapTempo } from '@/components/app/shell/studio-transport';
import { Slider } from '@/components/app/studio/panels/controls';
import { ShelfList } from '@/components/app/studio/panels/patterns-panel';
import { SpeedsCard } from '@/components/app/studio/panels/speeds-card';
import { Segmented } from '@/components/app/studio/segmented';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { TempoControl } from '@/components/app/studio/tempo-control';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { MixerDesk } from '@/components/app/studio/player/mixer-desk';
import { PLAYER_WIDE, useMedia } from '@/components/app/studio/player/use-media';

export function PracticePanel() {
  const c = useStudio();
  const tapTempo = useTapTempo();
  /* From the player's width up the mixer is on the player, a desk beside the
     music; the drawer keeps it only on a phone, which has no player bar. */
  const onPlayer = useMedia(PLAYER_WIDE);

  return (
    <>
      {/* The shelf you are drilling from, where you are when you drill it —
          asked for on seeing 4.6. Only when there is something on it: an
          empty shelf is the Patterns drawer's to explain. */}
      {c.pins.shelves.practising.length ? (
        <div className="card">
          <div className="card-hd">
            <h3>Practising</h3>
          </div>
          <div className="card-bd">
            <ShelfList shelf="practising" empty={null} />
          </div>
        </div>
      ) : null}
      <div className="card">
        <div className="card-hd">
          <h3>Click and tempo</h3>
        </div>
        <div className="card-bd">
          <div className="field">
            <span className="fieldlab">Metronome</span>
            <div className="btnrow">
              <Toggle pressed={c.click} onPressedChange={c.setClick}>
                Click
              </Toggle>
              <Segmented
                label="Click plays"
                small
                options={[
                  { value: 4, face: 'Quarters' },
                  { value: 8, face: 'Eighths' },
                ]}
                value={c.clickSub}
                onChange={c.setClickSub}
              />
            </div>
          </div>

          {/* Count-in and Tap are on the player's bar from its width up; a
              phone's footer has neither, so here they are on a phone (E3). */}
          {onPlayer ? null : (
            <div className="field">
              <span className="fieldlab">Count-in</span>
              <Segmented
                label="Count-in"
                small
                options={[0, 1, 2].map((n) => ({ value: n, face: countInLabel(n) }))}
                value={c.countIn}
                onChange={c.setCountIn}
              />
            </div>
          )}

          {/* The tempo with its slider, for the big moves, which neither the
              player's bar nor the phone's footer has room for (E4). */}
          <div className="field">
            <span className="fieldlab">Tempo</span>
            <div className="btnrow">
              <TempoControl slider />
              {onPlayer ? null : (
                <button type="button" className="mini" aria-label="Tap tempo" onClick={tapTempo}>
                  Tap
                </button>
              )}
            </div>
            <div className="hint">
              {onPlayer
                ? 'Type a tempo, hold − or +, or drag. Tap is on the player.'
                : 'Type a tempo, hold − or +, or tap four times on the beat.'}
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">
              Tempo trainer{' '}
              <StudioHelp title="Tempo trainer">
                Adds BPM every time the arrangement comes round, and stops at your ceiling.
              </StudioHelp>
            </span>
            <Segmented
              label="Tempo trainer"
              small
              options={[0, 1, 2, 5].map((n) => ({ value: n, face: n ? `+${n}` : 'Off' }))}
              value={c.ramp}
              onChange={c.setRamp}
            />
          </div>

          <Slider label="Ceiling" value={c.ceiling} onChange={c.setCeiling} min={60} max={200} />

          <div className="field">
            <span className="fieldlab">Quick tempo</span>
            <div className="btnrow">
              {[60, 75, 90, 100].map((pct) => (
                <button key={pct} type="button" className="mini" onClick={() => c.quickTempo(pct)}>
                  {pct === 100 ? 'Back to 100%' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">
              Match tempo to layer{' '}
              <StudioHelp title="Match tempo to layer">
                Skeleton at 68% of the break&apos;s own tempo, Groove at 78%, Sixteenths at 86%,
                Ghosted at 93%, Full break as written. Move the tempo while this is on and you are
                setting the speed for that layer, not the break.
              </StudioHelp>
            </span>
            <div className="btnrow">
              <Toggle pressed={c.matchTempo} onPressedChange={c.setMatchTempo}>
                Match tempo
              </Toggle>
            </div>
          </div>
        </div>
      </div>

      <SpeedsCard />

      {/* the player's own desk, the one mixer at every width */}
      {onPlayer ? null : (
        <div className="card">
          <div className="card-hd">
            <h3>Mixer</h3>
          </div>
          <div className="card-bd">
            <MixerDesk />
          </div>
        </div>
      )}
    </>
  );
}
