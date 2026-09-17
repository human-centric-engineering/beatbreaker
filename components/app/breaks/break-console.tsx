'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
import { StepEditor } from '@/components/app/breaks/step-editor';
import { useBreakConsole } from '@/components/app/breaks/use-break-console';
import { DOCTOR_MOVES } from '@/lib/app/breaks/doctor';
import { engrave } from '@/lib/app/breaks/engrave';
import { KITS, KIT_KEYS, kitIsPlayable } from '@/lib/app/breaks/kit';
import { LANE_DEFS, activeLanes, laneName } from '@/lib/app/breaks/lanes';
import { LAYER_BLURB, LAYER_NAMES } from '@/lib/app/breaks/layers';
import { libraryGroups } from '@/lib/app/breaks/library';
import { METERS, METER_KEYS, meterOf, pulseInfo } from '@/lib/app/breaks/meter';
import { STYLES, STYLE_GROUPS } from '@/lib/app/breaks/styles';
import type { SectionLetter } from '@/lib/app/breaks/audio/transport';

import '@/components/app/breaks/breaks.css';
import { cn } from '@/lib/utils';

/**
 * The console: chart and step editor on the left, everything that changes them
 * on the right.
 *
 * One client component holds the state (see `useBreakConsole`) and the rest is
 * presentation, because every panel here can change something every other panel
 * displays — the style picks a meter and a kit, the meter changes the tempo
 * ceiling, a doctor move re-runs the critic. Splitting that into islands would
 * mean lifting it all back up again immediately.
 */

type Tab = 'gen' | 'doctor' | 'lib' | 'kit' | 'practice' | 'export';

const TABS: Array<[Tab, string]> = [
  ['gen', 'Generate'],
  ['doctor', 'Doctor'],
  ['lib', 'Library'],
  ['kit', 'Kit'],
  ['practice', 'Practice'],
  ['export', 'Export'],
];

export function BreakConsole() {
  const c = useBreakConsole();
  const staveA = useRef<StaveHandle>(null);
  const staveB = useRef<StaveHandle>(null);
  const [tab, setTab] = useState<Tab>('gen');
  const [toast, setToast] = useState('');
  const [codeIn, setCodeIn] = useState('');
  const tapsRef = useRef<number[]>([]);

  const say = (msg: string) => setToast(msg);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const scale = 1;
  const engravings = useMemo(
    () => ({
      A: c.view.A
        ? engrave(c.view.A, null, { scale, perSystem: 2, guides: c.guides, sticking: c.sticking })
        : null,
      B: c.view.B
        ? engrave(c.view.B, null, { scale, perSystem: 2, guides: c.guides, sticking: c.sticking })
        : null,
    }),
    [c.view.A, c.view.B, c.guides, c.sticking]
  );

  /* The playhead is driven imperatively — sixteen re-renders a bar to move one
     rectangle would re-render the whole staff with it. */
  useEffect(() => {
    const pos = c.position;
    if (!pos || pos.count) {
      staveA.current?.clear();
      staveB.current?.clear();
      return;
    }
    const target = pos.letter === 'B' ? staveB : staveA;
    const other = pos.letter === 'B' ? staveA : staveB;
    const eng = pos.letter === 'B' ? engravings.B : engravings.A;
    other.current?.clear();
    if (eng && pos.barIdx != null)
      target.current?.moveTo(eng.map[pos.barIdx * eng.steps + pos.slot]);
  }, [c.position, engravings]);

  const tapTempo = () => {
    const now = performance.now();
    const taps = tapsRef.current.filter((t) => now - t < 2400);
    taps.push(now);
    tapsRef.current = taps.slice(-4);
    if (tapsRef.current.length < 2) return;
    const gaps = tapsRef.current.slice(1).map((t, i) => t - tapsRef.current[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (mean > 120) c.setBpm(60000 / mean);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      say(`${label} copied`);
    } catch {
      say('Copy blocked — select the text manually');
    }
  };

  const style = STYLES[c.style];
  const meter = meterOf(c.meter);
  const pulse = pulseInfo(meter);
  const shown: SectionLetter[] = c.viewMode === 'both' ? ['A', 'B'] : [c.viewMode];
  const editingView = c.view[c.editing];
  const editingStored = c.patterns[c.editing];

  const cursor =
    c.position && !c.position.count && c.position.letter === c.editing && c.position.barIdx != null
      ? c.position.barIdx * (engravings[c.editing]?.steps ?? 16) + c.position.slot
      : null;

  if (!c.ready || !c.view.A) {
    return (
      <div className="bb">
        <main className="console">
          <p className="hint" style={{ padding: 24 }}>
            Writing you a break…
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="bb">
      <header className="topbar">
        <div className="brand">
          <b>
            Beat<i>Breaker</i>
          </b>
          <span>break generator &amp; practice rig</span>
        </div>

        <div className="transport">
          <button
            type="button"
            className={cn('tbtn play', c.playing && 'on')}
            onClick={c.togglePlay}
            aria-label="Play or stop"
          >
            {c.playing ? '■ Stop' : '▶ Play'}
          </button>
          <button
            type="button"
            className="tbtn icon"
            title="Count-in bars"
            onClick={() => c.setCountIn((c.countIn + 1) % 3)}
          >
            <span className="mono">{c.countIn}</span>
          </button>
          <div className="bpmbox">
            <div className="bpmval mono">
              {c.bpm}
              <sup>bpm</sup>
            </div>
            <input
              type="range"
              min={50}
              max={c.bpmCeiling}
              value={c.bpm}
              onChange={(e) => c.setBpm(Number(e.target.value))}
              aria-label="Tempo"
            />
            <button type="button" className="tbtn" title="Tap four times" onClick={tapTempo}>
              Tap
            </button>
          </div>
          <div className="leds" aria-hidden="true">
            {activeLanes(c.view.A.lanes).map((lane) => {
              const lit =
                c.position && !c.position.count && c.position.bar
                  ? !!c.position.bar[lane][c.position.slot]
                  : false;
              return (
                <i
                  key={lane}
                  className={cn('led', lit && 'fire')}
                  style={{ ['--lit' as string]: LANE_DEFS[lane].color }}
                />
              );
            })}
          </div>
        </div>

        <div className="spacer" />
        <div className="posread mono">
          {c.position && !c.position.count && c.position.letter ? (
            <>
              <b>{c.position.letter}</b> · bar <b>{(c.position.barIdx ?? 0) + 1}</b> · loop{' '}
              <b>{c.loops}</b>
            </>
          ) : (
            <>
              <b>–</b> · bar <b>–</b> · loop <b>{c.loops}</b>
            </>
          )}
        </div>
      </header>

      <main className="console">
        <section className="stage">
          <div className="chartwrap">
            <div className="chart-hd">
              <div className="title-block">
                <h2>{c.view.A.name}</h2>
                <div className="title-sub">
                  <span className="chip">{style?.label ?? c.style}</span>
                  <span className="chip brass">
                    {c.bars} bar{c.bars === 1 ? '' : 's'}
                  </span>
                  <span className="chip">seed {String(c.view.A.seed).slice(-4)}</span>
                  <span className="chip rust">
                    Layer {c.level} · {LAYER_NAMES[c.level]}
                  </span>
                  {style?.feel ? <span className="chip teal">{style.feel.label}</span> : null}
                </div>
              </div>

              <div className="seg" role="group" aria-label="Which section to show and play">
                {(['A', 'B', 'both'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={c.viewMode === v}
                    onClick={() => c.setViewMode(v)}
                  >
                    {v === 'both' ? 'A + B' : `${v} only`}
                  </button>
                ))}
              </div>

              <div className="seg small" role="group" aria-label="Difficulty layer">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={c.level === n}
                    title={`${LAYER_NAMES[n]} — ${LAYER_BLURB[n]}`}
                    onClick={() => c.setLevel(n)}
                  >
                    L{n}
                  </button>
                ))}
              </div>
            </div>

            {shown.map((letter) => {
              const eng = engravings[letter];
              if (!eng) return null;
              return (
                <Stave
                  key={letter}
                  ref={letter === 'A' ? staveA : staveB}
                  engraving={eng}
                  label={c.viewMode === 'both' ? letter : undefined}
                  playing={c.position?.letter === letter}
                />
              );
            })}

            <div className="legend">
              <span>
                <i style={{ background: 'var(--steel)' }} />
                Kick
              </span>
              <span>
                <i style={{ background: 'var(--rust)' }} />
                Snare
              </span>
              <span>
                <i style={{ background: 'color-mix(in srgb,var(--rust) 40%, transparent)' }} />
                Ghost
              </span>
              <span>
                <i style={{ background: 'var(--teal)' }} />
                Hi-hat
              </span>
              <span>
                <i style={{ background: 'var(--brass)' }} />
                Ride
              </span>
              <span>
                <i style={{ background: 'var(--plum)' }} />
                Crash
              </span>
            </div>

            <div className="chart-ft">
              <span className="eyebrow">Arrangement</span>
              <div className="arr">
                {c.arrangement.map((letter, i) => (
                  <button
                    key={i}
                    type="button"
                    className={c.position?.secIdx === i ? 'now' : undefined}
                    onClick={() =>
                      c.setArrangement(
                        c.arrangement.map((x, j) => (j === i ? (x === 'A' ? 'B' : 'A') : x))
                      )
                    }
                  >
                    {letter}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mini"
                title="Add a section"
                onClick={() => c.setArrangement([...c.arrangement, 'A'])}
              >
                +
              </button>
              <button
                type="button"
                className="mini"
                title="Remove last section"
                onClick={() => c.setArrangement(c.arrangement.slice(0, -1))}
                disabled={c.arrangement.length <= 1}
              >
                −
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <h3>Step editor</h3>
              <span className="hint">Click a cell to cycle it. Shift-click steps back.</span>
              <div className="spacer" />
              <div className="seg small" role="group" aria-label="Edit which section">
                {(['A', 'B'] as const).map((L) => (
                  <button
                    key={L}
                    type="button"
                    aria-pressed={c.editing === L}
                    onClick={() => c.setEditing(L)}
                  >
                    Edit {L}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-bd">
              {editingView && editingStored ? (
                <StepEditor
                  view={editingView}
                  stored={editingStored}
                  cursor={cursor}
                  onCycle={(bar, lane, step, back) => c.cycleCell(c.editing, bar, lane, step, back)}
                />
              ) : null}
              <div className="hint" style={{ marginTop: 10 }}>
                The grid shows <b>the layer you are on</b>, so what you see is what you hear. A note
                added at a lower layer is pinned there — marked with a dot — instead of being
                derived back out: a ghost note written at L2 is a ghost note L2 keeps.
              </div>
            </div>
          </div>
        </section>

        <aside className="rail">
          <button type="button" className="bigbtn" onClick={() => c.newBreak('both')}>
            New break
          </button>

          <div className="tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'gen' ? (
            <>
              <div className="card">
                <div className="card-hd">
                  <h3>Generator</h3>
                </div>
                <div className="card-bd">
                  <div className="field">
                    <label htmlFor="bb-style">Style</label>
                    <select
                      id="bb-style"
                      value={c.style}
                      onChange={(e) => c.setStyle(e.target.value)}
                    >
                      {STYLE_GROUPS.map(([group, keys]) => (
                        <optgroup key={group} label={group}>
                          {keys.map((k) => (
                            <option key={k} value={k}>
                              {STYLES[k]?.label ?? k}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div className="hint">{style?.hint}</div>
                  </div>

                  <div className="field">
                    <label htmlFor="bb-meter">Time signature</label>
                    <select
                      id="bb-meter"
                      value={c.meter}
                      onChange={(e) => c.setMeter(e.target.value)}
                    >
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
                    label={`Swing (${style?.swingUnit === 8 ? '8ths' : '16ths'})`}
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
                    hint="0% gives machine-even hats, accents and wobble included."
                  />
                  {style?.feel ? (
                    <Slider
                      label="Off-grid feel"
                      value={c.feel}
                      onChange={c.setFeel}
                      max={150}
                      suffix="%"
                      hint="Drag it to 0 to hear the same notes quantised. The click and the playhead never move — the gap between them and the kit is the feel."
                    />
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
                          {k === 'bpm'
                            ? 'Tempo'
                            : k === 'k'
                              ? 'Kick'
                              : k === 's'
                                ? 'Snare'
                                : 'Hats'}
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
                          <span className="mlab">{d.key}</span>
                          <span className="mbar">
                            <i style={{ width: `${Math.round(d.v * 100)}%` }} />
                          </span>
                          <span className="mval mono">{d.read}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="verdict">{c.report?.verdict}</div>
                  <div className="checks">
                    {c.checks?.checks.map((k) => (
                      <div key={k.label} className={cn('check', k.ok ? 'ok' : 'bad')}>
                        {k.ok ? '✓' : '✕'} {k.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {tab === 'doctor' ? (
            <div className="card">
              <div className="card-hd">
                <h3>Break doctor</h3>
              </div>
              <div className="card-bd">
                <div className="hint" style={{ marginBottom: 12 }}>
                  Musical edits applied to whichever section you are editing (<b>{c.editing}</b>).
                  Each one re-runs the critic, so you can see whether the move helped.
                </div>
                <div className="btnrow">
                  {DOCTOR_MOVES.map(({ move, label }) => (
                    <button
                      key={move}
                      type="button"
                      className="mini"
                      onClick={() => c.applyDoctor(move)}
                    >
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
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'lib' ? (
            <div className="card">
              <div className="card-hd">
                <h3>Famous breaks</h3>
              </div>
              <div className="card-bd">
                <div className="list">
                  {libraryGroups().map(([group, items]) => (
                    <div key={group}>
                      <div className="eyebrow" style={{ margin: '10px 0 4px' }}>
                        {group}
                      </div>
                      {items.map(({ item, index }) => (
                        <button
                          key={index}
                          type="button"
                          className="listrow"
                          title={item.note}
                          onClick={() => {
                            c.loadLibraryItem(index);
                            say(
                              item.note ? `${item.title} — ${item.note}` : `${item.title} loaded`
                            );
                          }}
                        >
                          <b>{item.title}</b>
                          <span>{item.artist}</span>
                          <span className="mono">{item.bpm}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="hint" style={{ marginTop: 12 }}>
                  The main groove off each record — a bar or two of it, in the meter it was played
                  in. Fills and variations are not here. The feel studies at the bottom are written
                  rather than transcribed, and say so.
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'kit' ? (
            <div className="card">
              <div className="card-hd">
                <h3>Kit</h3>
              </div>
              <div className="card-bd">
                <div className="field">
                  <label htmlFor="bb-kit">Kit</label>
                  <select id="bb-kit" value={c.kit} onChange={(e) => c.setKit(e.target.value)}>
                    {KIT_KEYS.map((k) => (
                      <option key={k} value={k} disabled={!kitIsPlayable(k)}>
                        {KITS[k].label}
                        {kitIsPlayable(k) ? '' : ' — not ported yet'}
                      </option>
                    ))}
                  </select>
                  <div className="hint">{KITS[c.kit]?.hint}</div>
                  {KITS[c.kit]?.credit ? (
                    <div className="hint mono">{KITS[c.kit].credit}</div>
                  ) : null}
                </div>
                <div className="btnrow">
                  {(['k', 's', 'h', 'r', 'c', 't', 'p'] as const).map((v) => (
                    <button key={v} type="button" className="mini" onClick={() => c.audition(v)}>
                      {v === 't' ? 'Toms' : v === 'p' ? 'Perc' : LANE_DEFS[v].name}
                    </button>
                  ))}
                </div>
                <div className="hint" style={{ marginTop: 12 }}>
                  The five synthesised kits are a graph per hit, so every knob is live. The recorded
                  kits decode on first pick, and any lane still arriving falls through to the
                  synthesised voice — a half-loaded kit still plays. The TR-808 and TR-909 voice
                  models are the one engine not ported yet.
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'practice' ? (
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

                  <Slider
                    label="Ceiling"
                    value={c.ceiling}
                    onChange={c.setCeiling}
                    min={60}
                    max={200}
                  />

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
                  {activeLanes(c.view.A.lanes).map((lane) => (
                    <div className="mixrow" key={lane}>
                      <button
                        type="button"
                        className={cn('mini', c.mute[lane] && 'on')}
                        onClick={() => c.toggleMute(lane)}
                        aria-pressed={!!c.mute[lane]}
                      >
                        {c.mute[lane] ? 'M' : '·'}
                      </button>
                      <span className="rowlab" style={{ color: LANE_DEFS[lane].color }}>
                        {laneName(lane, c.view.A?.perc)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={130}
                        value={Math.round((c.mix[lane] ?? 1) * 100)}
                        onChange={(e) => c.setLaneMix(lane, Number(e.target.value) / 100)}
                        aria-label={`${laneName(lane, c.view.A?.perc)} level`}
                      />
                    </div>
                  ))}
                  <div className="hint" style={{ marginTop: 10 }}>
                    Faders start where the style puts them — a few styles push a lane down because
                    something else is the music and that lane was sitting on it. Move one and it is
                    yours until you hit <b>Back to the style</b>.
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {tab === 'export' ? (
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
                  </div>
                  <div className="hint">
                    The code carries both sections, the tempo, swing and the style — paste it to
                    anyone.
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
                      onClick={() =>
                        say(c.loadCode(codeIn) ? 'Break loaded' : 'That is not a BeatBreaker code')
                      }
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
                  </div>
                  <div className="hint">
                    GM drum map, one bar per bar, velocity-mapped ghosts. Swing and the style&apos;s
                    off-grid feel are written into the tick positions, so the export drags where the
                    playback drags. <code>base64 -d &gt; break.mid</code> in a terminal.
                  </div>
                </div>

                <div className="field">
                  <span className="fieldlab">Chart</span>
                  <div className="btnrow">
                    <button
                      type="button"
                      className={cn('mini', c.guides && 'on')}
                      onClick={() => c.setGuides(!c.guides)}
                    >
                      Counting guide
                    </button>
                    <button
                      type="button"
                      className={cn('mini', c.sticking && 'on')}
                      onClick={() => c.setSticking(!c.sticking)}
                    >
                      Sticking
                    </button>
                  </div>
                  <div className="hint">⌘P prints just the chart.</div>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </main>

      <div className={cn('toast', toast && 'show')} role="status">
        {toast}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = '',
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
}) {
  const id = `bb-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="row">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="val mono">
          {value}
          {suffix}
        </span>
      </div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
