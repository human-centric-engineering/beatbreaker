'use client';

import { Slider, meterHue } from '@/components/app/studio/panels/controls';
import { useStudio } from '@/components/app/studio/studio-provider';
import { HAT_SHAPE } from '@/lib/app/breaks/feel';
import { kitIsPlayable } from '@/lib/app/breaks/kit';
import { BASE_LANES, PERC_INSTS, PERC_KEYS, PERC_LANES, laneName } from '@/lib/app/breaks/lanes';
import { METERS, METER_KEYS, meterOf, pulseInfo } from '@/lib/app/breaks/meter';
import { type CustomLanes, resolveLanes } from '@/lib/app/breaks/pattern';
import { styleIn } from '@/lib/app/breaks/styles';
import { cn } from '@/lib/utils';

export function GeneratePanel() {
  const c = useStudio();
  const { styles, styleGroups, kits, kitGroups } = c.catalogue;

  const styleRow = styles[c.style];
  const style = styleRow?.params;
  const meter = meterOf(c.meter);
  const pulse = pulseInfo(meter);

  /**
   * The dynamics quoted back as numbers.
   *
   * A percentage on a slider says how much of the shape is applied; it does not
   * say what the shape *is*. These read the same tables playback reads, so what
   * the panel claims and what the kit does cannot drift apart.
   */
  const hatRead = ((): string => {
    if (c.hats === 0) return 'every hat the same weight — machine-even, accents and wobble off';
    const depth = c.hats / 100;
    const pc = (step: number) => Math.round((1 - (1 - HAT_SHAPE[step]) * depth) * 100);
    return `beat ${pc(0)}% · \u201cand\u201d ${pc(2)}% · \u201ce\u201d and \u201ca\u201d ${pc(1)}% · written accents on top`;
  })();

  const feelRead = ((): string => {
    const f = style?.feel;
    if (!f) return '';
    if (c.feel === 0) return 'straight — every hit lands on the grid';
    // one grid step is a sixteenth, in every meter
    const step = 60 / c.bpm / 4;
    const ms = (v: number | [number, number] | undefined): string => {
      const n = Array.isArray(v) ? v[1] : (v ?? 0);
      const x = Math.round(n * step * 1000 * (c.feel / 100));
      return `${x > 0 ? '+' : ''}${x} ms`;
    };
    return `kick ${ms(f.k)} · snare ${ms(f.s)} · off-16th hats ${ms(f.h)}`;
  })();

  /* Turning a lane on rewrites the break in place, so this is what is on the
     screen rather than what the next one would get. The picker below reads the
     same roster while it is following a style, which is how you can see what
     the style asked for without taking it over first. */
  const roster = resolveLanes(
    style ? styleIn(style, c.meter) : undefined,
    c.lanesMode === 'custom' ? c.customLanes : null
  );
  const shownLanes: CustomLanes =
    c.lanesMode === 'custom'
      ? c.customLanes
      : {
          toms: roster.lanes.includes('t1'),
          p1: roster.lanes.includes('p1') ? roster.perc.p1 : undefined,
          p2: roster.lanes.includes('p2') ? roster.perc.p2 : undefined,
        };
  const extras = roster.lanes
    .filter((L) => !BASE_LANES.includes(L))
    .map((L) => laneName(L, roster.perc));

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <h3>Generator</h3>
        </div>
        <div className="card-bd">
          <div className="field">
            <label htmlFor="bb-style">Style</label>
            <select id="bb-style" value={c.style} onChange={(e) => c.setStyle(e.target.value)}>
              {styleGroups.map(([group, keys]) => (
                <optgroup key={group} label={group}>
                  {keys.map((k) => (
                    <option key={k} value={k}>
                      {styles[k]?.params.label ?? k}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="hint">{style?.hint}</div>
          </div>

          <div className="field">
            <label htmlFor="bb-gen-kit">Kit</label>
            <select id="bb-gen-kit" value={c.kit} onChange={(e) => c.setKit(e.target.value)}>
              {kitGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.keys.map((k) => (
                    <option key={k} value={k} disabled={!kitIsPlayable(kits[k])}>
                      {kits[k].label}
                      {kitIsPlayable(kits[k]) ? '' : ' — not ported yet'}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="hint">
              {kits[c.kit]?.label}
              {style?.kit === c.kit
                ? ' — chosen by the style. Pick another and it stays picked.'
                : ' — your pick, kept across styles that do not name one.'}{' '}
              {c.kit === 'brush' ? '' : 'Sticks; pick Brush kit for brushes. '}
              {kits[c.kit]?.hint}
            </div>
          </div>

          <div className="field">
            <label htmlFor="bb-meter">Time signature</label>
            <select id="bb-meter" value={c.meter} onChange={(e) => c.setMeter(e.target.value)}>
              {METER_KEYS.map((k) => (
                <option key={k} value={k}>
                  {METERS[k].label}
                </option>
              ))}
            </select>
            <div className="hint">
              {meter.hint}
              {pulse ? (
                <>
                  {' '}
                  At {c.bpm} on the slider that is a {pulse.label} of{' '}
                  <b>{Math.round((c.bpm * 4) / pulse.steps)}</b>.
                </>
              ) : null}
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">Kit lanes</span>
            <div className="btnrow">
              <button
                type="button"
                className="mini"
                aria-pressed={c.lanesMode === 'custom'}
                onClick={() => {
                  /* Switching to custom starts from what you can already
                     hear rather than from an empty kit: the picker has
                     been showing the style's roster all along, so taking
                     it over should not silently change the sound. */
                  if (c.lanesMode === 'style') c.setCustomLanes(shownLanes);
                  c.setLanesMode(c.lanesMode === 'style' ? 'custom' : 'style');
                }}
              >
                {c.lanesMode === 'style' ? 'Following the style' : 'Choosing my own'}
              </button>
            </div>
            {/* Shown while following the style too, disabled — it is how
                you see what the style asked for, and what you would be
                starting from if you took it over. */}
            <div className="lanepick" data-locked={c.lanesMode === 'style' ? '1' : '0'}>
              <label className="lanechk">
                <input
                  type="checkbox"
                  checked={!!shownLanes.toms}
                  onChange={(e) => c.setCustomLanes({ ...shownLanes, toms: e.target.checked })}
                />
                Toms
              </label>
              {PERC_LANES.map((L, i) => (
                <div className="row" key={L}>
                  <label htmlFor={`bb-perc-${L}`}>Perc {i + 1}</label>
                  <select
                    id={`bb-perc-${L}`}
                    value={shownLanes[L] ?? ''}
                    onChange={(e) =>
                      c.setCustomLanes({ ...shownLanes, [L]: e.target.value || undefined })
                    }
                  >
                    <option value="">Off</option>
                    {PERC_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {PERC_INSTS[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="hint">
              {extras.length
                ? `On top of the kit: ${extras.join(', ')}.`
                : 'Kick, snare, hats, ride and crash. Toms and percussion arrive when a style asks for them, or when you do.'}{' '}
              Toms are notated at the usual heights — high in the fourth space, mid on the fourth
              line, floor in the second. Percussion gets its own line above the staff. The foot
              follows the style either way: without it a jazz groove loses the only thing marking 2
              and 4.
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">Bars per section</span>
            <div className="seg small" role="group" aria-label="Bars">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={c.bars === n}
                  onClick={() => c.setBars(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Slider label="Kick density" value={c.density} onChange={c.setDensity} />
          <Slider label="Ghost notes" value={c.ghosts} onChange={c.setGhosts} />
          <Slider
            label={style?.swingUnit === 8 ? 'Shuffle (8ths)' : 'Swing (16ths)'}
            value={c.swing}
            onChange={c.setSwing}
            suffix="%"
          />
          <Slider
            label="Hi-hat dynamics"
            value={c.hats}
            onChange={c.setHats}
            max={150}
            suffix="%"
            hint={hatRead}
          />
          {style?.feel ? (
            <>
              <Slider
                label="Off-grid feel"
                value={c.feel}
                onChange={c.setFeel}
                max={150}
                suffix="%"
              />
              <div className="hint mono" style={{ marginTop: -8, marginBottom: 12 }}>
                {feelRead}
              </div>
              <div className="hint" style={{ marginTop: -8, marginBottom: 12 }}>
                Drag it to 0 to hear the same notes quantised. The click and the playhead never move
                — the gap between them and the kit is the feel.
              </div>
            </>
          ) : null}

          <div className="field">
            <span className="fieldlab">Lock while regenerating</span>
            <div className="btnrow">
              {(['k', 's', 'h', 'bpm'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={cn('mini', c.locks[k] && 'on')}
                  onClick={() => c.toggleLock(k)}
                >
                  {k === 'bpm' ? 'Tempo' : k === 'k' ? 'Kick' : k === 's' ? 'Snare' : 'Hats'}
                </button>
              ))}
            </div>
          </div>

          <div className="btnrow" style={{ marginTop: 6 }}>
            <button type="button" className="mini" onClick={() => c.newBreak('A')}>
              New A only
            </button>
            <button type="button" className="mini" onClick={() => c.newBreak('B')}>
              New B only
            </button>
            <button type="button" className="mini" onClick={c.buildBFromA}>
              Build B from A
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Groove critic</h3>
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
    </>
  );
}
