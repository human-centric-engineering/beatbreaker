'use client';

import { Slider } from '@/components/app/studio/panels/controls';
import { useStudio } from '@/components/app/studio/studio-provider';
import { LANE_DEFS, activeLanes, laneName } from '@/lib/app/breaks/lanes';
import { cn } from '@/lib/utils';

export function PracticePanel() {
  const c = useStudio();
  const style = c.catalogue.styles[c.style];
  /* The console guarded on a pattern existing before it drew anything; a panel
     is mounted on its own, so the mixer asks for itself. No pattern means no
     lanes to fade, not an empty Practice panel. */
  const lanes = c.view.A ? activeLanes(c.view.A.lanes) : [];

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <h3>Practice rig</h3>
        </div>
        <div className="card-bd">
          <div className="field">
            <span className="fieldlab">Metronome</span>
            <div className="btnrow">
              <button
                type="button"
                className={cn('mini', c.click && 'on')}
                onClick={() => c.setClick(!c.click)}
              >
                Click {c.click ? 'on' : 'off'}
              </button>
              <button
                type="button"
                className="mini"
                onClick={() => c.setClickSub(c.clickSub === 4 ? 8 : 4)}
              >
                {c.clickSub === 4 ? 'Quarters' : 'Eighths'}
              </button>
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">Tempo trainer</span>
            <div className="btnrow">
              <button
                type="button"
                className={cn('mini', !c.ramp && 'on')}
                onClick={() => c.setRamp(0)}
              >
                Ramp off
              </button>
              {[1, 2, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cn('mini', c.ramp === n && 'on')}
                  onClick={() => c.setRamp(n)}
                >
                  +{n}
                </button>
              ))}
            </div>
            <div className="hint">
              Adds BPM every time the arrangement comes round. Stops at your ceiling.
            </div>
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
            <span className="fieldlab">Match tempo to layer</span>
            <div className="btnrow">
              <button
                type="button"
                className={cn('mini', c.matchTempo && 'on')}
                aria-pressed={c.matchTempo}
                onClick={() => c.setMatchTempo(!c.matchTempo)}
              >
                {c.matchTempo ? 'On' : 'Off'}
              </button>
            </div>
            <div className="hint">
              L1 at 68% of the break&apos;s own tempo, L2 at 78%, L3 at 86%, L4 at 93%, L5 as
              written. Move the tempo slider while this is on and you are setting the speed for that
              layer, not the break.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Mixer</h3>
          <div className="spacer" />
          {Object.keys(c.mixTouched).length ? (
            <button type="button" className="mini" onClick={c.resetMix}>
              Back to the style
            </button>
          ) : null}
          <span className="hint">Mute a limb to play it yourself</span>
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
              <button
                type="button"
                className={cn('mini', 'mixmute', c.mute[lane] && 'on')}
                onClick={() => c.toggleMute(lane)}
                aria-pressed={!!c.mute[lane]}
                aria-label={`Mute ${laneName(lane, c.view.A?.perc)}`}
              >
                {c.mute[lane] ? 'Muted' : 'Mute'}
              </button>
            </div>
          ))}
          <div className="hint" style={{ marginTop: 10 }}>
            Faders start where the style puts them — a few styles push a lane down because something
            else is the music and that lane was sitting on it. Move one and it is yours until you
            hit <b>Back to the style</b>.
          </div>
        </div>
      </div>
    </>
  );
}
