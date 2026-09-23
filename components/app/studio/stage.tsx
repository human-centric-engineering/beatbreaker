'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
import { StepEditor } from '@/components/app/breaks/step-editor';
import { useStudio } from '@/components/app/studio/studio-provider';
import { type SectionLetter } from '@/lib/app/breaks/audio/transport';
import { engrave } from '@/lib/app/breaks/engrave';
import { LAYER_BLURB, LAYER_NAMES } from '@/lib/app/breaks/layers';
import { cn } from '@/lib/utils';

/**
 * The chart and the step editor: what the Studio is actually for.
 *
 * Everything that *changes* the break is in a drawer; this is the one thing on
 * screen at every width, and the frame is built so that its bounding box does
 * not move when a drawer opens.
 */
export function Stage() {
  const c = useStudio();
  const staveA = useRef<StaveHandle>(null);
  const staveB = useRef<StaveHandle>(null);
  const [showEditor, setShowEditor] = useState(true);

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
      <p className="hint" style={{ padding: 24 }}>
        Writing you a break…
      </p>
    );
  }

  return (
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
              {style?.feel && c.feel ? <span className="chip teal">{style.feel.label}</span> : null}
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
            added at a lower layer is pinned there — marked with a dot — instead of being derived
            back out: a ghost note written at L2 is a ghost note L2 keeps.
          </div>
        </div>
      </div>
    </section>
  );
}
