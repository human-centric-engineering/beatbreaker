'use client';

import { countInLabel, useTapTempo } from '@/components/app/shell/studio-transport';
import { Slider } from '@/components/app/studio/panels/controls';
import { ShelfList } from '@/components/app/studio/panels/patterns-panel';
import { Segmented } from '@/components/app/studio/segmented';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { LANE_DEFS, activeLanes, laneName } from '@/lib/app/breaks/lanes';

export function PracticePanel() {
  const c = useStudio();
  const tapTempo = useTapTempo();
  const style = c.catalogue.styles[c.style]?.params;
  /* The console guarded on a pattern existing before it drew anything; a panel
     is mounted on its own, so the mixer asks for itself. No pattern means no
     lanes to fade, not an empty Practice panel. */
  const lanes = c.view.A ? activeLanes(c.view.A.lanes) : [];

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

          {/* Count-in and Tap live in the header transport too, but that is
              not on a phone; here they are at every width (E3). */}
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

          <div className="field">
            <span className="fieldlab">Tap tempo</span>
            <div className="btnrow">
              <button type="button" className="mini" aria-label="Tap tempo" onClick={tapTempo}>
                Tap
              </button>
            </div>
            <div className="hint">Tap four times on the beat.</div>
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
                <button
                  key={pct}
                  type="button"
                  className="mini"
                  onClick={() => c.setBpm(Math.round((style?.bpm[0] ?? 94) * (pct / 100)))}
                >
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

      <div className="card">
        <div className="card-hd">
          <h3>Mixer</h3>
          <StudioHelp title="Mixer">
            Mute a limb to play it yourself. Faders start where the style puts them — a few styles
            push a lane down because something else is the music and that lane was sitting on it.
            Move one and it is yours until you hit <b>Back to the style</b>.
          </StudioHelp>
          <div className="spacer" />
          {Object.keys(c.mixTouched).length ? (
            <button type="button" className="mini" onClick={c.resetMix}>
              Back to the style
            </button>
          ) : null}
        </div>
        <div className="card-bd">
          {lanes.map((lane) => (
            <div className="mixrow" key={lane}>
              <i style={{ background: LANE_DEFS[lane].color }} />
              {/* a real label for a real control, so the fader is named
                  to a screen reader by the same text you can click */}
              <label htmlFor={`bb-mix-${lane}`}>{laneName(lane, c.view.A?.perc)}</label>
              <input
                id={`bb-mix-${lane}`}
                type="range"
                min={0}
                max={130}
                value={Math.round((c.mix[lane] ?? 1) * 100)}
                onChange={(e) => c.setLaneMix(lane, Number(e.target.value) / 100)}
              />
              <Toggle
                className="mini mixmute"
                pressed={!!c.mute[lane]}
                onPressedChange={() => c.toggleMute(lane)}
                label={`Mute ${laneName(lane, c.view.A?.perc)}`}
              >
                Mute
              </Toggle>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
