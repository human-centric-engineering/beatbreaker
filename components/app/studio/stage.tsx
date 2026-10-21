'use client';

import { Video } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
import { StepEditor } from '@/components/app/breaks/step-editor';
import { useChartFollow } from '@/components/app/studio/use-chart-follow';
import { DrummerView } from '@/components/app/studio/drummer/drummer-view';
import { PlayerBar } from '@/components/app/studio/player/player-bar';
import { StudyHeader } from '@/components/app/studio/player/study-header';
import { PIP_WIDE, PLAYER_WIDE, useMedia } from '@/components/app/studio/player/use-media';
import { type Segment, Segmented } from '@/components/app/studio/segmented';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { type SectionLetter } from '@/lib/app/breaks/audio/transport';
import { GRID_SIZE, GRID_SIZE_MAX, GRID_SIZE_MIN, STAGE_VIEW } from '@/lib/app/breaks/browser-keys';
import { type Engraving } from '@/lib/app/breaks/engrave';
import {
  MAX_ARRANGEMENT,
  type TempoRatio,
  cycleLetter,
  FOUR_THIRDS,
  TWO_THIRDS,
  ratioLabel,
  ratioOf,
} from '@/lib/app/breaks/sections';
import { engrave } from '@/lib/app/breaks/engrave';
import { layerBlurbsFor, layerNamesFor, tupletShows } from '@/lib/app/breaks/layers';
import { useStoredSetting } from '@/lib/app/breaks/use-stored-setting';
import { cn } from '@/lib/utils';

/**
 * A section's tempo against the break's: half, the same, double, and the
 * metric modulations between them (12-d) — the old triplet as the new beat
 * (×3/2), the old dotted eighth (×4/3), and the way back from each.
 */
/** What the paper's padding takes from a line's width, either side together (`.paper`). */
const PAPER_PAD = 10;
/** No smaller than this to fit a phone: below it the notes are too small to read, so the line scrolls. */
const PHONE_MIN_SCALE = 0.55;

const TEMPO_CHOICES: Segment<TempoRatio | 1>[] = [
  { value: 0.5, face: ratioLabel(0.5), title: "Half the break's tempo" },
  { value: TWO_THIRDS, face: ratioLabel(TWO_THIRDS), title: 'Two thirds: back from the triplet' },
  { value: 0.75, face: ratioLabel(0.75), title: 'Three quarters: back from the dotted eighth' },
  { value: 1, face: ratioLabel(1), title: "The break's tempo" },
  {
    value: FOUR_THIRDS,
    face: ratioLabel(FOUR_THIRDS),
    title: 'The old dotted eighth is the new beat',
  },
  { value: 1.5, face: ratioLabel(1.5), title: 'The old triplet is the new beat' },
  { value: 2, face: ratioLabel(2), title: "Double the break's tempo" },
];

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
  const chartView = stageView === 'chart';
  /* The player's bar from a phone's width up; the drummer kept in the chart
     view's corner from a tablet's. */
  const onPlayer = useMedia(PLAYER_WIDE);
  const pipShown = useMedia(PIP_WIDE);
  /* One stave per section on show, each reached by its letter. */
  const staveRefs = useRef<Partial<Record<SectionLetter, StaveHandle | null>>>({});
  const [showEditor, setShowEditor] = useState(true);

  /* The engraver takes the next layer as a second pattern and draws whatever
     it adds in faint ink. Handing it `null` is how the preview is turned off —
     there is no separate "preview" mode inside the engraving. */
  const peek = c.preview ? c.next : null;
  /* The chart's width on a phone, where a line is fitted to it. */
  const [chartEl, setChartEl] = useState<HTMLDivElement | null>(null);
  const [room, setRoom] = useState(0);
  useEffect(() => {
    if (!chartEl || onPlayer) return;
    setRoom(chartEl.clientWidth);
    if (typeof ResizeObserver !== 'function') return;
    const watch = new ResizeObserver(() => setRoom(chartEl.clientWidth));
    watch.observe(chartEl);
    return () => watch.disconnect();
  }, [chartEl, onPlayer]);
  const engravings = useMemo(() => {
    const opts = {
      scale: c.size,
      /* Two bars to a line from the player's width up. On a phone one, and
         at Size 100% that bar is the screen's width, so the chart reads down
         the page rather than off its edge; a bigger Size scrolls the line
         sideways. Every section at one size, fitted to the widest. */
      perSystem: onPlayer ? 2 : 1,
      guides: c.guides,
      sticking: c.sticking,
    };
    const write = (o: typeof opts) => {
      const out: Partial<Record<SectionLetter, Engraving>> = {};
      for (const letter of c.letters) {
        const pat = c.view[letter];
        if (pat) out[letter] = engrave(pat, peek?.[letter] ?? null, o);
      }
      return out;
    };
    const out = write(opts);
    if (onPlayer || room <= 0) return out;
    const widest = Math.max(0, ...Object.values(out).map((e) => e?.width ?? 0));
    const fit = (room - PAPER_PAD) / (widest / c.size);
    const scale = Math.max(PHONE_MIN_SCALE, Math.min(c.size, c.size * fit));
    return scale === c.size ? out : write({ ...opts, scale });
  }, [c.letters, c.view, peek, c.guides, c.sticking, c.size, onPlayer, room]);

  /* The playhead is driven imperatively — sixteen re-renders a bar to move one
     rectangle would re-render the whole staff with it. */
  useEffect(() => {
    const pos = c.position;
    const at = pos && !pos.count ? pos.letter : undefined;
    for (const [letter, stave] of Object.entries(staveRefs.current)) {
      if (letter !== at) stave?.clear();
    }
    if (!pos || !at) return;
    const eng = engravings[at];
    if (eng && pos.barIdx != null)
      staveRefs.current[at]?.moveTo(eng.map[pos.barIdx * eng.steps + pos.slot]);
  }, [c.position, engravings]);
  /* After the playhead has moved: the chart follows it down, a line at a time. */
  const pos = c.position;
  useChartFollow(
    chartEl,
    pos && !pos.count && pos.barIdx != null ? `${pos.letter}:${pos.barIdx}` : null
  );

  /* A polyrhythm's layers are its streams built up, and say so (D54), in
     the order they are counted. The section on the stage decides: All shows
     A's. Its streams, not its style key, since they are what the layers
     reduce by. */
  const poly = (c.viewMode === 'both' ? c.view.A : c.view[c.viewMode])?.poly;
  const layerNames = layerNamesFor(!!poly, c.feelCross);
  const layerBlurbs = layerBlurbsFor(!!poly, c.feelCross);
  const [crossNum, pulseNum] = poly?.ratio.includes(':') ? poly.ratio.split(':') : [];
  const viewMode = c.viewMode;
  const shown: SectionLetter[] = viewMode === 'both' ? c.letters : [viewMode];
  /** The section on show, when it is one a break can do without. */
  const deletable = viewMode !== 'both' && viewMode !== 'A' && viewMode !== 'B' ? viewMode : null;
  /** The section on show, when one is: its tempo ratio is picked beside it. */
  const single = viewMode !== 'both' ? viewMode : null;
  /* A stave names its section under All, and its speed wherever it is not the
     break's (11-e-ii-g): engraving prints no tempo, so the letter carries it. */
  const staveLabel = (letter: SectionLetter): string | undefined => {
    const r = ratioOf(c.patterns[letter]);
    if (r !== 1) return `${letter} ${ratioLabel(r)}`;
    return viewMode === 'both' ? letter : undefined;
  };
  /* What BeatBuddy just changed, as the chart indexes steps: any lane changed
     on a step lights that step. */
  const flashSteps = useMemo(() => {
    const out: Partial<Record<SectionLetter, number[]>> = {};
    if (!c.flash) return out;
    for (const letter of c.letters) {
      const steps = c.patterns[letter]?.bars[0]?.k.length ?? 16;
      const seen = new Set<number>();
      for (const key of c.flash.cells[letter] ?? []) {
        const [bar, , step] = key.split(':');
        seen.add(Number(bar) * steps + Number(step));
      }
      out[letter] = [...seen];
    }
    return out;
  }, [c.flash, c.letters, c.patterns]);

  const editingView = c.view[c.editing];
  const editingStored = c.patterns[c.editing];
  /* The Sticking row (Phase 14) shows with Sticking on or where the section
     writes hands, and once up it stays up for the section: clearing the last
     hand from its picker should not take the row away while you use it. */
  const handsWanted = c.sticking || !!editingStored?.sticking?.some(Boolean);
  const [handsKept, setHandsKept] = useState<SectionLetter | null>(null);
  if (handsWanted && handsKept !== c.editing) setHandsKept(c.editing);
  const showHands = handsWanted || handsKept === c.editing;

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
          ref={
            live
              ? (h: StaveHandle | null) => {
                  staveRefs.current[letter] = h;
                }
              : undefined
          }
          engraving={eng}
          label={staveLabel(letter)}
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

  const toChart = () => setStageView('chart');
  const toDrummer = () => setStageView('drummer');

  return (
    <section
      className={cn(
        'stage',
        chartView ? 'stage--chart' : 'stage--drummer',
        chartView && pipShown && 'has-pip'
      )}
    >
      {/* The drummer: the picture in the drummer view, and — from a tablet's
          width up — kept small in the top corner of the chart view, so it
          never leaves the screen. One element in one place, so changing view
          keeps the same player at the kit. */}
      <div className="player-dock">
        {chartView && !pipShown ? null : (
          <DrummerView pip={chartView} onExpand={toDrummer} onChart={toChart} />
        )}
      </div>

      <StudyHeader>
        {/* A polyrhythm is learnt felt both ways round (D54): which of its
            streams you count is layer 1, and what the click plays. */}
        {poly ? (
          <Segmented
            label="Count"
            small
            options={[
              {
                value: false,
                face: pulseNum ? `The ${pulseNum}` : 'The pulse',
                title: 'Count the pulse: layer 1 plays it alone, and the click is the beat',
              },
              {
                value: true,
                face: crossNum ? `The ${crossNum}` : `The ${poly.ratio}`,
                title:
                  'Count the cross-rhythm: layer 1 plays it alone, and the click follows it, louder at the start of each cycle',
              },
            ]}
            value={c.feelCross}
            onChange={c.setFeelCross}
          />
        ) : null}
      </StudyHeader>

      {/* A phone has no player bar: the view, the section and the layer are
          chosen here, over the chart. */}
      {onPlayer ? null : (
        <div className="stage-phone-picks">
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
              plays it, and the grid and the Doctor below work on it. All is
              stored as `both`, its name from when a break had two. */}
          <Segmented
            label="Section"
            options={[...c.letters, 'both' as const].map((v) => ({
              value: v,
              face: v === 'both' ? 'All' : v,
              keyshortcuts: v === 'both' ? 'V' : v === 'A' || v === 'B' ? v : undefined,
            }))}
            value={c.viewMode}
            onChange={c.setViewMode}
          />
          <Segmented
            label="Difficulty layer"
            small
            options={[1, 2, 3, 4, 5].map((n) => ({
              value: n,
              title: `${layerBlurbs[n]} (${n})`,
              keyshortcuts: String(n),
              /* The name leads (E12); the number is the key that picks it. */
              face: (
                <>
                  <span className="layer-key" aria-hidden="true">
                    {n}
                  </span>
                  {layerNames[n]}
                </>
              ),
            }))}
            value={c.level}
            onChange={c.setLevel}
          />
        </div>
      )}

      {chartView ? (
        <div className="chartwrap" ref={setChartEl}>
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
                onPressedChange={(on) => {
                  c.setSticking(on);
                  // turned off, the row goes unless the section writes hands
                  if (!on) setHandsKept(null);
                }}
                title="Print the suggested hand and foot under each note, and show the Sticking row for writing your own"
              >
                Sticking
              </Toggle>
              <Toggle
                pressed={c.preview}
                onPressedChange={c.setPreview}
                disabled={!c.next}
                title={
                  c.next
                    ? `Show what ${layerNames[c.level + 1]} adds, in faint ink`
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
        </div>
      ) : (
        /* Print chart and ⌘P still print the chart: the staves are kept,
           still and unseen, for the page alone. */
        <div className="drummer-print">{staves(false)}</div>
      )}

      <div className="chartwrap arrangement">
        <div className="chart-ft">
          <span className="eyebrow">Arrangement</span>
          <div className="arr" role="group" aria-label="Arrangement">
            {c.arrangement.map((letter, i) => {
              /* A tap moves the slot on to the next section the break has. */
              const next = cycleLetter(c.patterns, letter);
              return (
                <button
                  key={i}
                  type="button"
                  className={c.position?.secIdx === i ? 'now' : undefined}
                  aria-label={`Slot ${i + 1} plays ${letter}`}
                  title={`Switch to ${next}`}
                  onClick={() =>
                    c.setArrangement(c.arrangement.map((x, j) => (j === i ? next : x)))
                  }
                >
                  {letter}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="mini"
            title={
              c.arrangement.length >= MAX_ARRANGEMENT
                ? `An arrangement has ${MAX_ARRANGEMENT} slots at most`
                : 'Add a slot'
            }
            aria-label="Add a slot"
            onClick={() => c.setArrangement([...c.arrangement, 'A'])}
            disabled={c.arrangement.length >= MAX_ARRANGEMENT}
          >
            +
          </button>
          <button
            type="button"
            className="mini"
            title="Remove the last slot"
            aria-label="Remove the last slot"
            onClick={() => c.setArrangement(c.arrangement.slice(0, -1))}
            disabled={c.arrangement.length <= 1}
          >
            −
          </button>
          <span className="spacer" />
          {/* Sections themselves (11-e-ii): a new one is written as New
              would write it, in the pickers' style, meter and length. A and
              B are every break's, so only a section past them can go. */}
          <button
            type="button"
            className="mini"
            onClick={() => c.addSection()}
            disabled={!!c.addSectionBlocked}
            title={
              c.addSectionBlocked ?? 'Write a new section in the style, meter and length picked'
            }
          >
            + Section
          </button>
          {deletable ? (
            <button
              type="button"
              className="mini"
              onClick={() => c.deleteSection(deletable)}
              title={`Delete section ${deletable} and its slots in the arrangement`}
            >
              Delete {deletable}
            </button>
          ) : null}
          {/* How fast the section on show plays against the break's tempo
              (11-e-ii-g): Landlord's fast section at double its slow one. */}
          {single && c.patterns[single] ? (
            <Segmented<TempoRatio | 1>
              small
              label={`Section ${single}'s tempo`}
              options={TEMPO_CHOICES}
              value={ratioOf(c.patterns[single])}
              onChange={(r) => c.setSectionTempo(single, r)}
            />
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Step editor</h3>
          <span className="hint">
            Tap to set a cell, a brush to change it; hold for every value.
          </span>
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
              flash={c.flash?.cells[c.editing]}
              flashSeq={c.flash?.seq}
              onCycle={(bar, lane, step, back) => c.cycleCell(c.editing, bar, lane, step, back)}
              section={c.editing}
              onSet={c.setCell}
              onTuplet={(bar, lane, step, edit) => c.editTuplet(c.editing, bar, lane, step, edit)}
              canTuplet={(lane) => tupletShows(editingStored, c.level, lane, c.feelCross)}
              onHands={
                showHands ? (bar, step, edit) => c.editHands(c.editing, bar, step, edit) : undefined
              }
              zoom={gridSize}
              aside={
                <div className="grid-foot">
                  <span className="hint">
                    The grid shows <b>the layer you are on</b>.
                  </span>
                  <span className="grid-helps">
                    <span className="grid-help">
                      Layers
                      <StudioHelp title="The grid and layers">
                        What you see is what you hear. A note added at a lower layer is pinned there
                        — marked with a dot — instead of being derived back out: a ghost note
                        written at Groove is a ghost note Groove keeps.
                      </StudioHelp>
                    </span>
                    <span className="grid-help">
                      Setting a cell
                      <StudioHelp title="Setting a cell">
                        A tap writes the lane&rsquo;s lit brush in an empty cell and selects it; a
                        tap on a note selects it, and a second tap clears it. While a note is
                        selected, lighting another brush in its lane rewrites it — make a hit an
                        accent or a flam without clearing it — and a press anywhere off the grid and
                        the brushes lets it go. Each lane&rsquo;s brush is its usual hit until you
                        light another under the grid — a cross-stick, say, and a row of them is a
                        row of taps. Hold a cell (or right-click it, or press the context-menu key)
                        for every value it can have — a cross-stick, an open hat. Drag along a lane
                        to paint the value the first cell took; Undo takes the whole drag back. On a
                        phone a swipe scrolls the grid, and it follows the playhead as it plays.
                        Shift-click steps back through the values. Grid, beside the chart&rsquo;s
                        Size, makes the cells bigger. From the Ghosted layer up, the same menu can
                        cut the cell&rsquo;s beat into a tuplet — five, six, seven even notes where
                        the grid has four. A tuplet shows as its beat&rsquo;s cells merged and cut
                        into its notes, numbered; tap a note to set it, and hold one to give the
                        beat back to the grid.
                      </StudioHelp>
                    </span>
                    {showHands ? (
                      <span className="grid-help">
                        Sticking
                        <StudioHelp title="Writing the sticking">
                          The Sticking row under the lanes is the hands: tap a step for R, again for
                          L, and again to leave it to the drummer. Hold it (or right-click it) to
                          keep a flam&rsquo;s or drag&rsquo;s graces on the same stick, to write the
                          rest of the bar hand to hand from there, or to clear the bar. The chart
                          prints what you write and the drummer plays it. A hand that cannot reach
                          its note — an L on the ride — is struck through, and the drummer plays
                          that step as if nothing were written. Changing a note keeps the hands on
                          every step that still has one.
                        </StudioHelp>
                      </span>
                    ) : null}
                  </span>
                </div>
              }
            />
          ) : null}
        </div>
      </div>

      {/* Under the chart, the player's bar is docked at the foot of the stage:
          the same transport as over the drummer, where the drummer is small. */}
      {chartView && onPlayer ? (
        <PlayerBar
          variant="docked"
          view={
            <button
              type="button"
              className="player-tool"
              onClick={toDrummer}
              aria-label="Drummer view"
              title="Watch the drummer play it, in 3D"
            >
              <Video size={18} />
            </button>
          }
        />
      ) : null}
    </section>
  );
}
