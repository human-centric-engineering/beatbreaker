'use client';

import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
import { StepEditor } from '@/components/app/breaks/step-editor';
import type { BreakConsole } from '@/components/app/breaks/use-break-console';
import { useStudio } from '@/components/app/studio/studio-provider';
import { DOCTOR_MOVES } from '@/lib/app/breaks/doctor';
import { engrave } from '@/lib/app/breaks/engrave';
import {
  KITS,
  SLOTS,
  SYNTH_ONLY,
  VOICE_KEYS,
  VOICE_LABEL,
  fmtParam,
  kitEngine,
  kitGroups,
  kitIsPlayable,
  paramDefs,
} from '@/lib/app/breaks/kit';
import {
  BASE_LANES,
  LANE_DEFS,
  PERC_LANES,
  PERC_INSTS,
  PERC_KEYS,
  activeLanes,
  laneName,
} from '@/lib/app/breaks/lanes';
import { HAT_SHAPE } from '@/lib/app/breaks/feel';
import { LAYER_BLURB, LAYER_NAMES } from '@/lib/app/breaks/layers';
import { libraryGroups } from '@/lib/app/breaks/library';
import { METERS, METER_KEYS, meterOf, pulseInfo } from '@/lib/app/breaks/meter';
import { type CustomLanes, resolveLanes } from '@/lib/app/breaks/pattern';
import { STYLES, STYLE_GROUPS, styleIn } from '@/lib/app/breaks/styles';
import { type SectionLetter, beatOf } from '@/lib/app/breaks/audio/transport';
import type { LaneKey } from '@/lib/app/breaks/types';

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

/**
 * What each lamp says when it is not lit. A strip of blank squares is a strip
 * of blank squares; the letter is how you know which limb just fired without
 * having learnt the colours first.
 */
const LED_CHAR: Record<LaneKey, string> = {
  c: 'C',
  r: 'R',
  h: 'H',
  s: 'S',
  k: 'K',
  t1: '1',
  t2: '2',
  t3: '3',
  hf: 'F',
  p1: 'P',
  p2: 'P',
};

type Tab = 'gen' | 'doctor' | 'lib' | 'kit' | 'practice' | 'export';

/**
 * A critic bar is read at a glance, so it is coloured rather than measured:
 * green is fine, brass is worth a look, red is the thing costing you the score.
 */
function meterHue(v: number): string {
  if (v > 0.7) return 'var(--ok)';
  return v > 0.4 ? 'var(--brass)' : 'var(--bad)';
}

const TABS: Array<[Tab, string]> = [
  ['gen', 'Generate'],
  ['doctor', 'Doctor'],
  ['lib', 'Library'],
  ['kit', 'Kit'],
  ['practice', 'Practice'],
  ['export', 'Export'],
];

export function BreakConsole() {
  const c = useStudio();
  const staveA = useRef<StaveHandle>(null);
  const staveB = useRef<StaveHandle>(null);
  const [tab, setTab] = useState<Tab>('gen');
  const [toast, setToast] = useState('');
  const [showEditor, setShowEditor] = useState(true);
  const [codeIn, setCodeIn] = useState('');
  const tapsRef = useRef<number[]>([]);

  const say = (msg: string) => setToast(msg);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  /* The engraver takes the next layer as a second pattern and draws whatever
     it adds in faint ink. Handing it `null` is how the preview is turned off —
     there is no separate "preview" mode inside the engraving. */
  const peek = c.preview ? c.next : null;
  const engravings = useMemo(() => {
    const opts = {
      scale: c.size,
      perSystem: 2,
      guides: c.guides,
      sticking: c.sticking,
    };
    return {
      A: c.view.A ? engrave(c.view.A, peek?.A ?? null, opts) : null,
      B: c.view.B ? engrave(c.view.B, peek?.B ?? null, opts) : null,
    };
  }, [c.view.A, c.view.B, peek, c.guides, c.sticking, c.size]);

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

  /**
   * The console from the keyboard.
   *
   * Bound on the document rather than on a focused element: there is no one
   * place to stand, and the alternative — a roving tabindex over the chart —
   * buys nothing for what these do. Anything typed into a field is left alone,
   * or `b` would stop being a letter the moment you paste a break code.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) {
        return;
      }
      if (e.altKey) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) c.redo();
        else c.undo();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;

      if (e.key === ' ') {
        e.preventDefault();
        c.togglePlay();
      } else if (e.key === 'n' || e.key === 'N') {
        c.newBreak('both');
      } else if (e.key >= '1' && e.key <= '5') {
        c.setLevel(Number(e.key));
      } else if (e.key === 'g') {
        c.setGuides(!c.guides);
      } else if (e.key === 'a') {
        c.setViewMode('A');
      } else if (e.key === 'b') {
        c.setViewMode('B');
      } else if (e.key === 'v') {
        c.setViewMode('both');
      } else if (e.key === '[') {
        c.setBpm(c.bpm - 2);
      } else if (e.key === ']') {
        c.setBpm(c.bpm + 2);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [c]);

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
  /* The lane roster is read at generation time, so this describes the *next*
     break rather than the one on screen — which is why the hint below it says
     so rather than listing what the current chart happens to carry. */
  /**
   * What the sampled kits have actually decoded. A kit that is still arriving
   * plays the synthesised voice for the lanes it has not got, and saying so is
   * the difference between "this kit sounds wrong" and "this kit is not here
   * yet".
   */
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
    return `beat ${pc(0)}% · “and” ${pc(2)}% · “e” and “a” ${pc(1)}% · written accents on top`;
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

  const kitStatus = ((): string => {
    const engine = kitEngine(c.kit);
    if (engine === 'user') {
      return c.kitSlots ? `${c.kitSlots} of your own samples loaded` : 'No samples loaded yet';
    }
    if (engine !== 'pack') return '';
    return c.kitSlots ? `${c.kitSlots} recorded lanes loaded` : 'Decoding the recordings…';
  })();

  /* Turning a lane on rewrites the break in place, so this is what is on the
     screen rather than what the next one would get. The picker below reads the
     same roster while it is following a style, which is how you can see what
     the style asked for without taking it over first. */
  const roster = resolveLanes(
    styleIn(c.style, c.meter),
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
                  title={laneName(lane, c.view.A?.perc)}
                >
                  {LED_CHAR[lane] ?? '·'}
                </i>
              );
            })}
          </div>
        </div>

        <div className="spacer" />
        <div className="posread mono">
          {c.position && !c.position.count && c.position.letter ? (
            <>
              <b>{c.position.letter}</b> · bar <b>{(c.position.barIdx ?? 0) + 1}</b> · beat{' '}
              <b>{beatOf(c.view[c.position.letter], c.position.slot)}</b> · loop <b>{c.loops}</b>
            </>
          ) : (
            <>
              <b>–</b> · bar <b>–</b> · beat <b>–</b> · loop <b>{c.loops}</b>
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
                  {style?.feel && c.feel ? (
                    <span className="chip teal">{style.feel.label}</span>
                  ) : null}
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

            <div className="chart-tools">
              <span className="eyebrow">Chart</span>
              <div className="btnrow">
                <button
                  type="button"
                  className={cn('mini', c.guides && 'on')}
                  aria-pressed={c.guides}
                  title="Number the beats and the &ldquo;and&rdquo;s under the staff"
                  onClick={() => c.setGuides(!c.guides)}
                >
                  Counting guide
                </button>
                <button
                  type="button"
                  className={cn('mini', c.sticking && 'on')}
                  aria-pressed={c.sticking}
                  title="Print the suggested hand and foot under each note"
                  onClick={() => c.setSticking(!c.sticking)}
                >
                  Sticking
                </button>
                <button
                  type="button"
                  className={cn('mini', c.preview && 'on')}
                  aria-pressed={c.preview}
                  disabled={!c.next}
                  title={
                    c.next
                      ? `Show what L${c.level + 1} (${LAYER_NAMES[c.level + 1]}) adds, in faint ink`
                      : 'Layer 5 is the whole break — there is nothing above it'
                  }
                  onClick={() => c.setPreview(!c.preview)}
                >
                  Preview next layer
                </button>
              </div>

              {/* A plain div, not a <label>: wrapping the input would name it
                  "Size" from the visible text while the aria-label named it
                  "Chart size", which is two different names for one control.
                  The word stays on screen and the control keeps the longer
                  name, because "Size" on its own means nothing read aloud. */}
              <div className="sizer">
                <span className="eyebrow" aria-hidden="true">
                  Size
                </span>
                <input
                  type="range"
                  min={70}
                  max={170}
                  step={5}
                  value={Math.round(c.size * 100)}
                  onChange={(e) => c.setSize(Number(e.target.value) / 100)}
                  aria-label="Chart size"
                />
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
              <button
                type="button"
                className="mini"
                aria-expanded={showEditor}
                onClick={() => setShowEditor(!showEditor)}
              >
                {showEditor ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="card-bd" hidden={!showEditor}>
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
            New break <kbd>N</kbd>
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
                    <label htmlFor="bb-gen-kit">Kit</label>
                    <select
                      id="bb-gen-kit"
                      value={c.kit}
                      onChange={(e) => c.setKit(e.target.value)}
                    >
                      {kitGroups().map((group) => (
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
                    <div className="hint">
                      {KITS[c.kit]?.label}
                      {style?.kit === c.kit
                        ? ' — chosen by the style. Pick another and it stays picked.'
                        : ' — your pick, kept across styles that do not name one.'}{' '}
                      {c.kit === 'brush' ? '' : 'Sticks; pick Brush kit for brushes. '}
                      {KITS[c.kit]?.hint}
                    </div>
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
                          onChange={(e) =>
                            c.setCustomLanes({ ...shownLanes, toms: e.target.checked })
                          }
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
                      Toms are notated at the usual heights — high in the fourth space, mid on the
                      fourth line, floor in the second. Percussion gets its own line above the
                      staff. The foot follows the style either way: without it a jazz groove loses
                      the only thing marking 2 and 4.
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
                        Drag it to 0 to hear the same notes quantised. The click and the playhead
                        never move — the gap between them and the kit is the feel.
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
          ) : null}

          {tab === 'lib' ? (
            <div className="card">
              <div className="card-hd">
                <h3>Famous breaks</h3>
              </div>
              <div className="card-bd">
                {/* The group headings sit in the same column as the rows rather
                    than wrapping each group in a box of its own: one flex
                    column is what puts an even gap between every row, and what
                    lets the first heading lose its top padding. */}
                <div className="list">
                  {libraryGroups().map(([group, items]) => (
                    <Fragment key={group}>
                      <div className="list-hd">{group}</div>
                      {items.map(({ item, index }) => (
                        <button
                          key={index}
                          type="button"
                          className="item"
                          title={item.note}
                          onClick={() => {
                            c.loadLibraryItem(index);
                            say(
                              item.note ? `${item.title} — ${item.note}` : `${item.title} loaded`
                            );
                          }}
                        >
                          <div className="nm">
                            <b>{item.title}</b>
                            <span>{item.artist}</span>
                          </div>
                          {/* the meter rides with the tempo, because a break in
                              7/8 at 150 is not the same read as one in 4/4 */}
                          <span className="bpm">
                            {item.bpm}
                            {item.meter ? ` · ${item.meter}` : ''}
                          </span>
                        </button>
                      ))}
                    </Fragment>
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

          {tab === 'lib' ? (
            <div className="card">
              <div className="card-hd">
                <h3>My breaks</h3>
                <div className="spacer" />
                <button
                  type="button"
                  className="mini"
                  onClick={() => {
                    c.saveFav();
                    say('Saved to your breaks');
                  }}
                >
                  ＋ Save current
                </button>
              </div>
              <div className="card-bd">
                {c.favs.length ? (
                  <div className="list">
                    {c.favs.map((fav, i) => (
                      /* The row is the load button and the delete button side by
                         side rather than one nested in the other: a button inside
                         a button is not valid HTML, and every way of faking it
                         costs the keyboard the delete control. */
                      <div className="favrow" key={`${fav.code.slice(0, 12)}-${i}`}>
                        <button
                          type="button"
                          className="item"
                          onClick={() =>
                            say(c.loadFav(i) ? 'Loaded' : 'That saved break could not be read')
                          }
                        >
                          <div className="nm">
                            <b>{fav.name}</b>
                            <span>
                              {STYLES[fav.style]?.label ?? fav.style} · L{fav.level}
                            </span>
                          </div>
                          <span className="bpm">{fav.bpm}</span>
                        </button>
                        <button
                          type="button"
                          className="item kill"
                          aria-label={`Delete ${fav.name}`}
                          onClick={() => c.deleteFav(i)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="hint">
                    Nothing saved yet. <b>Save current</b> keeps the whole break — both sections,
                    the tempo, the swing and the layer — in this browser, thirty of them.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {tab === 'kit' ? (
            <>
              <div className="card">
                <div className="card-hd">
                  <h3>Kit</h3>
                </div>
                <div className="card-bd">
                  <div className="field">
                    <label htmlFor="bb-kit">Kit</label>
                    <select id="bb-kit" value={c.kit} onChange={(e) => c.setKit(e.target.value)}>
                      {kitGroups().map((group) => (
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
                    {KITS[c.kit]?.credit ? (
                      <div className="hint mono">{KITS[c.kit].credit}</div>
                    ) : null}
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
                    The five synthesised kits are a graph per hit, so every knob is live. The
                    recorded kits decode on first pick, and any lane still arriving falls through to
                    the synthesised voice — a half-loaded kit still plays. The TR-808 and TR-909
                    voice models are the one engine not ported yet.
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

                  {kitEngine(c.kit) === 'user' ? <SampleSlots c={c} say={say} /> : null}

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
                        Percussion is deliberately not tied to the kit — a tambourine over the
                        Studio &apos;70s set should be a tambourine — so the recordings load once
                        and every kit reaches them. Timbales had no source worth shipping, so they
                        stay synthesised either way.
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
                    {VOICE_HINTS[SYNTH_ONLY[c.voice] ? 'aux' : kitEngine(c.kit)] ??
                      VOICE_HINTS.synth}
                  </div>
                </div>
              </div>
            </>
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
                      L1 at 68% of the break&apos;s own tempo, L2 at 78%, L3 at 86%, L4 at 93%, L5
                      as written. Move the tempo slider while this is on and you are setting the
                      speed for that layer, not the break.
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
                    <button
                      type="button"
                      className="mini"
                      onClick={() => void copy(c.shareLink(), 'Link')}
                    >
                      Copy link
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
                      Playback is also driving <b>{c.midiPort}</b>, on the GM drum map — the same
                      notes at the same velocities, at the moment the transport scheduled them, so
                      the port swings and drags exactly where the speakers do. Mute a lane in the
                      mixer and the port still plays it.
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
                    ⌘P prints just the chart, exactly as it is set above it — the counting guide,
                    the sticking row and the size all come out with it.
                  </div>
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
  step,
  suffix = '',
  format,
  hint,
  onCommit,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /** Overrides the plain number readout — hertz, seconds, a multiplier. */
  format?: (n: number) => string;
  hint?: string;
  /** Fired when the drag ends, so tuning a voice can play it back to you. */
  onCommit?: () => void;
}) {
  /* The id used to be derived from the label, which was fine while every
     slider on the page had a different one. The kit panel has a master Room
     and a per-voice Room, and two `id="bb-room"` inputs mean the second
     label points at the first input — clicking it focuses the wrong slider.
     `useId` is unique per instance by construction. */
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="row">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
        />
        <span className="val mono">{format ? format(value) : `${value}${suffix}`}</span>
      </div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

/**
 * Your own one-shots, slot by slot.
 *
 * A hidden file input per slot rather than one shared input driven by a ref:
 * the label *is* the button, so the click reaches the input with no script at
 * all, and there is no "which slot was I filling?" state to get wrong.
 */
function SampleSlots({ c, say }: { c: BreakConsole; say: (msg: string) => void }) {
  return (
    <div className="field">
      <span className="fieldlab">Samples</span>
      <div className="slots">
        {SLOTS.map((slot) => {
          const name = c.userNames[slot.id];
          return (
            <div key={slot.id} className={cn('slot', name && 'filled')}>
              <b>
                {slot.label}
                {slot.opt ? <span className="opt">optional</span> : null}
              </b>
              <span className="fn mono">{name ?? '—'}</span>
              <label className="mini">
                {name ? 'Replace' : 'Load'}
                <input
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    void c.addSample(slot.id, file).then((err) => {
                      say(err || `${slot.label}: ${file.name}`);
                    });
                  }}
                />
              </label>
              {name ? (
                <button
                  type="button"
                  className="mini ghost"
                  aria-label={`Clear ${slot.label}`}
                  onClick={() => void c.removeSample(slot.id)}
                >
                  ✕
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="hint">
        Nothing is uploaded — the files stay in this browser. A slot you leave empty falls through
        to the synthesised voice, so a half-loaded kit still plays.
      </div>
    </div>
  );
}

/** What the knobs under each engine actually are. */
const VOICE_HINTS: Record<string, string> = {
  synth:
    'Cymbals are built from an inharmonic partial cluster plus a stick attack, not from filtered noise — Size shifts the whole cluster, Bright moves the filter it speaks through. An open hat is choked the moment the next hat lands, same as closing the pedal.',
  pack: 'A recording has no filter cutoff to offer, so what is left is how fast it plays back and how loud. Room is still per-lane, because the reverb send sits after every engine.',
  user: 'Your own recordings: speed, level and how much room they are sent to. Everything else was decided when the file was made.',
  aux: 'Toms and percussion are synthesised on every kit — no pack ships tom samples and neither machine has a cowbell worth having — so these are hertz and seconds whichever engine the rest of the kit is running.',
};
