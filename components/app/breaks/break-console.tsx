'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
import { StepEditor } from '@/components/app/breaks/step-editor';
import { DoctorPanel } from '@/components/app/studio/panels/doctor-panel';
import { ExportPanel } from '@/components/app/studio/panels/export-panel';
import { GeneratePanel } from '@/components/app/studio/panels/generate-panel';
import { KitPanel } from '@/components/app/studio/panels/kit-panel';
import { LibraryPanel } from '@/components/app/studio/panels/library-panel';
import { PracticePanel } from '@/components/app/studio/panels/practice-panel';
import { useStudio } from '@/components/app/studio/studio-provider';
import { engrave } from '@/lib/app/breaks/engrave';
import { LANE_DEFS, activeLanes, laneName } from '@/lib/app/breaks/lanes';
import { LAYER_BLURB, LAYER_NAMES } from '@/lib/app/breaks/layers';
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
  const [showEditor, setShowEditor] = useState(true);
  const tapsRef = useRef<number[]>([]);

  const { toast } = c;

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

  const style = c.catalogue.styles[c.style];
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

          {tab === 'gen' ? <GeneratePanel /> : null}

          {tab === 'doctor' ? <DoctorPanel /> : null}

          {tab === 'lib' ? <LibraryPanel /> : null}

          {tab === 'kit' ? <KitPanel /> : null}

          {tab === 'practice' ? <PracticePanel /> : null}

          {tab === 'export' ? <ExportPanel /> : null}
        </aside>
      </main>

      <div className={cn('toast', toast && 'show')} role="status">
        {toast}
      </div>
    </div>
  );
}
