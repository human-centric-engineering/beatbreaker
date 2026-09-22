'use client';

import { SampleSlots, Slider, VOICE_HINTS } from '@/components/app/studio/panels/controls';
import { useStudio } from '@/components/app/studio/studio-provider';
import {
  SYNTH_ONLY,
  VOICE_KEYS,
  VOICE_LABEL,
  fmtParam,
  kitEngine,
  kitIsPlayable,
  paramDefs,
} from '@/lib/app/breaks/kit';
import { cn } from '@/lib/utils';

export function KitPanel() {
  const c = useStudio();
  const { say } = c;
  const { kits: KITS, kitGroups } = c.catalogue;

  /**
   * What the sampled kits have actually decoded. A kit that is still arriving
   * plays the synthesised voice for the lanes it has not got, and saying so is
   * the difference between "this kit sounds wrong" and "this kit is not here
   * yet".
   */
  const kitStatus = ((): string => {
    const engine = kitEngine(c.kit);
    if (engine === 'user') {
      return c.kitSlots ? `${c.kitSlots} of your own samples loaded` : 'No samples loaded yet';
    }
    if (engine !== 'pack') return '';
    return c.kitSlots ? `${c.kitSlots} recorded lanes loaded` : 'Decoding the recordings…';
  })();

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <h3>Kit</h3>
        </div>
        <div className="card-bd">
          <div className="field">
            <label htmlFor="bb-kit">Kit</label>
            <select id="bb-kit" value={c.kit} onChange={(e) => c.setKit(e.target.value)}>
              {kitGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.keys.map((k) => (
                    <option key={k} value={k} disabled={!kitIsPlayable(k)}>
                      {KITS[k].label}
                      {kitIsPlayable(k) ? '' : ' — not ported yet'}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="hint">{KITS[c.kit]?.hint}</div>
            {KITS[c.kit]?.credit ? <div className="hint mono">{KITS[c.kit].credit}</div> : null}
            {kitStatus ? <div className="hint mono">{kitStatus}</div> : null}
          </div>

          {/* The master chain, after all four engines — which is what
              makes the kits comparable rather than four separate apps. */}
          <Slider
            label="Room"
            value={Math.round((c.sound.master.room ?? 0) * 100)}
            onChange={(n) => c.setParam('master', 'room', n / 100)}
            suffix="%"
          />
          <Slider
            label="Drive"
            value={Math.round((c.sound.master.drive ?? 1) * 100)}
            onChange={(n) => c.setParam('master', 'drive', n / 100)}
            min={100}
            max={260}
            format={(n) => `${(n / 100).toFixed(2)}×`}
          />
          <Slider
            label="Top end"
            value={Math.round(c.sound.master.lp ?? 16000)}
            onChange={(n) => c.setParam('master', 'lp', n)}
            min={2500}
            max={18000}
            step={100}
            format={(n) => `${(n / 1000).toFixed(1)}k`}
            hint="Roll this off to get the dusty, sampled-off-vinyl sound."
          />

          <div className="btnrow">
            <button
              type="button"
              className="mini"
              onClick={() => {
                if (!c.auditionKit()) say('No Web Audio in this browser');
              }}
            >
              ▸ Play the kit
            </button>
          </div>

          <div className="hint" style={{ marginTop: 12 }}>
            The five synthesised kits are a graph per hit, so every knob is live. The recorded kits
            decode on first pick, and any lane still arriving falls through to the synthesised voice
            — a half-loaded kit still plays. The TR-808 and TR-909 voice models are the one engine
            not ported yet.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Voice</h3>
          <div className="spacer" />
          <button
            type="button"
            className="mini"
            onClick={() => {
              c.audition(c.voice, c.voice === 's' ? 'ghost' : undefined);
              if (c.voice === 'h' || c.voice === 'r') {
                window.setTimeout(
                  () => c.audition(c.voice, c.voice === 'h' ? 'open' : 'bell'),
                  330
                );
              }
            }}
          >
            ▸ Hear it
          </button>
        </div>
        <div className="card-bd">
          <div
            className="seg small"
            role="group"
            aria-label="Voice to tune"
            style={{ marginBottom: 14 }}
          >
            {VOICE_KEYS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={c.voice === v}
                onClick={() => {
                  c.setVoice(v);
                  c.audition(v, v === 't' ? 't2' : undefined);
                }}
              >
                {VOICE_LABEL[v]}
              </button>
            ))}
          </div>

          {kitEngine(c.kit) === 'user' ? <SampleSlots /> : null}

          {c.voice === 'p' && c.percCount ? (
            <div className="field">
              <span className="fieldlab">Percussion source</span>
              <div className="btnrow">
                <button
                  type="button"
                  className={cn('mini', c.percSamples && 'on')}
                  aria-pressed={c.percSamples}
                  onClick={() => c.setPercSamples(!c.percSamples)}
                >
                  {c.percSamples ? `Recorded (${c.percCount})` : 'Synthesised'}
                </button>
              </div>
              <div className="hint">
                Percussion is deliberately not tied to the kit — a tambourine over the Studio
                &apos;70s set should be a tambourine — so the recordings load once and every kit
                reaches them. Timbales had no source worth shipping, so they stay synthesised either
                way.
              </div>
            </div>
          ) : null}

          {paramDefs(c.voice, c.kit).map((def) => (
            <Slider
              key={def.key}
              label={def.label}
              value={c.sound[c.voice]?.[def.key] ?? def.min}
              onChange={(n) => c.setParam(c.voice, def.key, n)}
              min={def.min}
              max={def.max}
              step={def.step}
              format={(n) => fmtParam(def, n)}
              onCommit={() => c.audition(c.voice, c.voice === 'h' ? 'open' : undefined)}
            />
          ))}

          <div className="btnrow" style={{ marginTop: 4 }}>
            <button
              type="button"
              className="mini"
              onClick={() => {
                c.resetVoice(c.voice);
                c.audition(c.voice);
              }}
            >
              Reset this voice
            </button>
            <button
              type="button"
              className="mini ghost"
              disabled={!c.kitTuned}
              onClick={() => {
                c.resetKit();
                say(`${KITS[c.kit]?.label ?? c.kit} reset`);
              }}
            >
              Reset whole kit
            </button>
          </div>

          <div className="hint" style={{ marginTop: 14 }}>
            {VOICE_HINTS[SYNTH_ONLY[c.voice] ? 'aux' : kitEngine(c.kit)] ?? VOICE_HINTS.synth}
          </div>
        </div>
      </div>
    </>
  );
}
