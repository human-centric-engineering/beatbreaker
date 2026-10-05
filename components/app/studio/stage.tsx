'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
import type { PatternSharing } from '@/components/app/breaks/use-break-console';
import { StepEditor } from '@/components/app/breaks/step-editor';
import { DrummerView } from '@/components/app/studio/drummer/drummer-view';
import { PinButton } from '@/components/app/studio/pin-button';
import { Segmented } from '@/components/app/studio/segmented';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { type SectionLetter } from '@/lib/app/breaks/audio/transport';
import { GRID_SIZE, GRID_SIZE_MAX, GRID_SIZE_MIN, STAGE_VIEW } from '@/lib/app/breaks/browser-keys';
import { publicPath } from '@/lib/app/breaks/community/visibility';
import { engrave } from '@/lib/app/breaks/engrave';
import { LAYER_BLURB, LAYER_NAMES } from '@/lib/app/breaks/layers';
import { parseReferenceLink, type StoredLink } from '@/lib/app/breaks/links';
import { useStoredSetting } from '@/lib/app/breaks/use-stored-setting';

/**
 * The pattern's reference links as chips beside its title (task 4.11): ▶ Video
 * or ♫ Song, each opening in a new tab. Every href is re-read through the
 * allowlist on the way to the screen — a stored link that no longer passes is
 * not drawn, whatever put it there.
 */
function LinkChips({ links }: { links: StoredLink[] }) {
  if (!links.length) return null;
  return (
    <span className="title-links">
      {links.map((link, i) => {
        const parsed = parseReferenceLink(link.url);
        if (!parsed) return null;
        const text = link.label ?? (parsed.kind === 'video' ? 'Video' : 'Song');
        return (
          <a
            key={i}
            className="chip link"
            href={parsed.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${text} (opens in a new tab)`}
          >
            <span aria-hidden="true">{parsed.kind === 'video' ? '▶' : '♫'}</span> {text}
          </a>
        );
      })}
    </span>
  );
}

/**
 * The credit line on a variation (tasks 6.3, 7A): "Variation of _X_ by
 * @_Y_", linking to the pattern it came from. The server sends it only while
 * that pattern is published, so there is nothing here to decide.
 */
function BasedOn({ credit }: { credit: PatternSharing['basedOn'] }) {
  if (!credit) return null;
  return (
    <p className="title-credit">
      Variation of{' '}
      <a href={publicPath(credit.slug)} target="_blank" rel="noopener noreferrer">
        {credit.title}
      </a>{' '}
      by @{credit.username}
    </p>
  );
}

/**
 * The chart and the step editor: what the Studio is actually for.
 *
 * Everything that *changes* the break is in a drawer; this is the one thing on
 * screen at every width, and the frame is built so that its bounding box does
 * not move when a drawer opens.
 */
export function Stage() {
  const c = useStudio();
  const [gridSize, setGridSize] = useStoredSetting(GRID_SIZE);
  const [stageView, setStageView] = useStoredSetting(STAGE_VIEW);
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

  const style = c.catalogue.styles[c.style]?.params;
  const shown: SectionLetter[] = c.viewMode === 'both' ? ['A', 'B'] : [c.viewMode];
  /* What BeatBuddy just changed, as the chart indexes steps: any lane changed
     on a step lights that step. */
  const flashSteps = useMemo(() => {
    const out: Record<'A' | 'B', number[]> = { A: [], B: [] };
    if (!c.flash) return out;
    for (const letter of ['A', 'B'] as const) {
      const steps = c.patterns[letter]?.bars[0]?.k.length ?? 16;
      const seen = new Set<number>();
      for (const key of c.flash[letter]) {
        const [bar, , step] = key.split(':');
        seen.add(Number(bar) * steps + Number(step));
      }
      out[letter] = [...seen];
    }
    return out;
  }, [c.flash, c.patterns]);

  const editingView = c.view[c.editing];
  const editingStored = c.patterns[c.editing];

  const cursor =
    c.position && !c.position.count && c.position.letter === c.editing && c.position.barIdx != null
      ? c.position.barIdx * (engravings[c.editing]?.steps ?? 16) + c.position.slot
      : null;

  /** The chart's staves. `live` ones follow the playhead; the drummer view's
      print copy does not, so it costs nothing while the drummer plays. */
  const staves = (live: boolean) =>
    shown.map((letter) => {
      const eng = engravings[letter];
      if (!eng) return null;
      return (
        <Stave
          key={letter}
          ref={live ? (letter === 'A' ? staveA : staveB) : undefined}
          engraving={eng}
          label={c.viewMode === 'both' ? letter : undefined}
          playing={live && c.position?.letter === letter}
          flash={live ? flashSteps[letter] : undefined}
          flashSeq={live ? c.flash?.seq : undefined}
        />
      );
    });

  if (c.noCatalogue) {
    /* Not a loading state and not a crash: the styles come from the database
       now, and an install with none has nothing to write a break from. Saying
       which it is beats a spinner that never stops. */
    return (
      <p className="hint" style={{ padding: 24 }}>
        There are no styles in the catalogue yet, so there is nothing to write a break from. Seed
        the catalogue (<code>npm run db:seed</code>) and reload.
      </p>
    );
  }

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
            <div className="title-row">
              <h2>{c.view.A.name}</h2>
              <PinButton target={c.stagePin} label={c.view.A.name} />
              <LinkChips links={c.doc.details.links} />
            </div>
            <BasedOn credit={c.doc.sharing.basedOn} />
            {/* A fixed pattern is never edited in place (D26): the edit is a
                variation until it is saved, and undo back to the original
                takes the banner away. */}
            {c.doc.variationOf ? (
              <p className="title-credit variation-banner" role="status">
                You&rsquo;re making a variation of <b>{c.doc.variationOf}</b> — Save to keep it
              </p>
            ) : null}
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

          {/* The chart, or the drummer playing it (experiment). The section,
              the layer and the arrangement below drive both. */}
          <Segmented
            label="Show"
            options={[
              { value: 'chart' as const, face: 'Chart' },
              {
                value: 'drummer' as const,
                face: 'Drummer 3D',
                title: 'Watch a drummer play the break, in 3D',
              },
            ]}
            value={stageView}
            onChange={setStageView}
          />

          {/* The one section choice (E11): the chart shows it, the transport
              plays it, and the grid and the Doctor below work on it. */}
          <Segmented
            label="Section"
            options={(['A', 'B', 'both'] as const).map((v) => ({
              value: v,
              face: v === 'both' ? 'Both' : v,
              keyshortcuts: v === 'both' ? 'V' : v,
            }))}
            value={c.viewMode}
            onChange={c.setViewMode}
          />

          <Segmented
            label="Difficulty layer"
            small
            options={[1, 2, 3, 4, 5].map((n) => ({
              value: n,
              title: `${LAYER_BLURB[n]} (${n})`,
              keyshortcuts: String(n),
              /* The name leads (E12); the number is the key that picks it. */
              face: (
                <>
                  <span className="layer-key" aria-hidden="true">
                    {n}
                  </span>
                  {LAYER_NAMES[n]}
                </>
              ),
            }))}
            value={c.level}
            onChange={c.setLevel}
          />
        </div>

        {stageView === 'drummer' ? (
          <>
            <DrummerView />
            {/* Print chart and ⌘P still print the chart: the staves are kept,
                still and unseen, for the page alone. */}
            <div className="drummer-print">{staves(false)}</div>
          </>
        ) : (
          <>
            <div className="chart-tools">
              <span className="eyebrow">Chart</span>
              <div className="btnrow">
                <Toggle
                  pressed={c.guides}
                  onPressedChange={c.setGuides}
                  keyshortcuts="G"
                  title="Number the beats and the &ldquo;and&rdquo;s under the staff"
                >
                  Counting guide
                </Toggle>
                <Toggle
                  pressed={c.sticking}
                  onPressedChange={c.setSticking}
                  title="Print the suggested hand and foot under each note"
                >
                  Sticking
                </Toggle>
                <Toggle
                  pressed={c.preview}
                  onPressedChange={c.setPreview}
                  disabled={!c.next}
                  title={
                    c.next
                      ? `Show what ${LAYER_NAMES[c.level + 1]} adds, in faint ink`
                      : 'Full break is the whole break — there is nothing above it'
                  }
                >
                  Preview next layer
                </Toggle>
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
              {/* The grid's own zoom (5.14), beside the chart's: the chart is for
                  reading and the grid for tapping, and they want different sizes. */}
              <div className="sizer">
                <span className="eyebrow" aria-hidden="true">
                  Grid
                </span>
                <input
                  type="range"
                  min={GRID_SIZE_MIN * 100}
                  max={GRID_SIZE_MAX * 100}
                  step={5}
                  value={Math.round(gridSize * 100)}
                  onChange={(e) => setGridSize(Number(e.target.value) / 100)}
                  aria-label="Grid size"
                />
              </div>
            </div>

            {staves(true)}

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
          </>
        )}

        <div className="chart-ft">
          <span className="eyebrow">Arrangement</span>
          <div className="arr" role="group" aria-label="Arrangement">
            {c.arrangement.map((letter, i) => (
              <button
                key={i}
                type="button"
                className={c.position?.secIdx === i ? 'now' : undefined}
                aria-label={`Section ${i + 1} plays ${letter}`}
                title={`Switch to ${letter === 'A' ? 'B' : 'A'}`}
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
            aria-label="Add a section"
            onClick={() => c.setArrangement([...c.arrangement, 'A'])}
          >
            +
          </button>
          <button
            type="button"
            className="mini"
            title="Remove last section"
            aria-label="Remove last section"
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
          <span className="hint">Tap a cell to set or clear it; hold it for every value.</span>
          <div className="spacer" />
          {/* Which section the grid is, said rather than chosen: the choice is
              the one on the chart. With Both it follows the playhead, so it is
              not a live region — it would be read out every bar. */}
          <span className="chip">Section {c.editing}</span>
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
              flash={c.flash?.[c.editing]}
              flashSeq={c.flash?.seq}
              onCycle={(bar, lane, step, back) => c.cycleCell(c.editing, bar, lane, step, back)}
              section={c.editing}
              onSet={c.setCell}
              zoom={gridSize}
            />
          ) : null}
          <div className="hint" style={{ marginTop: 10 }}>
            The grid shows <b>the layer you are on</b>.{' '}
            <StudioHelp title="The grid and layers">
              What you see is what you hear. A note added at a lower layer is pinned there — marked
              with a dot — instead of being derived back out: a ghost note written at Groove is a
              ghost note Groove keeps.
            </StudioHelp>{' '}
            <StudioHelp title="Setting a cell">
              A tap gives the lane its usual hit, or clears a cell with a note. Hold a cell (or
              right-click it, or press the context-menu key) for every value it can have — a
              cross-stick, an open hat. Drag along a lane to paint the value the first cell took;
              Undo takes the whole drag back. Shift-click steps back through the values. Grid,
              beside the chart&rsquo;s Size, makes the cells bigger.
            </StudioHelp>
          </div>
        </div>
      </div>
    </section>
  );
}
