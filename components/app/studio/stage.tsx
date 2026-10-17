'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
import type { PatternSharing } from '@/components/app/breaks/use-break-console';
import { StepEditor } from '@/components/app/breaks/step-editor';
import { DrummerView } from '@/components/app/studio/drummer/drummer-view';
import { PinButton } from '@/components/app/studio/pin-button';
import { type Segment, Segmented } from '@/components/app/studio/segmented';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { type SectionLetter } from '@/lib/app/breaks/audio/transport';
import { GRID_SIZE, GRID_SIZE_MAX, GRID_SIZE_MIN, STAGE_VIEW } from '@/lib/app/breaks/browser-keys';
import { publicPath } from '@/lib/app/breaks/community/visibility';
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
import { songPartOf } from '@/lib/app/breaks/songs';
import { engrave } from '@/lib/app/breaks/engrave';
import { layerBlurbsFor, layerNamesFor, tupletShows } from '@/lib/app/breaks/layers';
import { styleLabel } from '@/lib/app/breaks/library';
import { parseReferenceLink, type StoredLink } from '@/lib/app/breaks/links';
import type { Pattern } from '@/lib/app/breaks/types';
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
 * A section's tempo against the break's: half, the same, double, and the
 * metric modulations between them (12-d) — the old triplet as the new beat
 * (×3/2), the old dotted eighth (×4/3), and the way back from each.
 */
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
 * Which song the pattern plays, for a style that has songs (a drummer playing
 * Manic Depression rather than "Mitch Mitchell"): the song and what it is,
 * and which part of it — the section on the stage — for a song written in
 * sections.
 * Read off the pattern's own style, not the picker's, which may already be
 * set for the next one.
 */
function SongLine({ pattern }: { pattern: Pattern }) {
  const c = useStudio();
  const part = songPartOf(c.catalogue.styles[pattern.style]?.params, pattern.song);
  if (!part) return null;
  const { song, section } = part;
  return (
    <p className="title-credit song-line">
      Playing style inspired by <b>{song.title}</b>
      {section ? ` (${section.label})` : ''} — {song.feel}
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
  /* One stave per section on show, each reached by its letter. */
  const staveRefs = useRef<Partial<Record<SectionLetter, StaveHandle | null>>>({});
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
    const out: Partial<Record<SectionLetter, Engraving>> = {};
    for (const letter of c.letters) {
      const pat = c.view[letter];
      if (pat) out[letter] = engrave(pat, peek?.[letter] ?? null, opts);
    }
    return out;
  }, [c.letters, c.view, peek, c.guides, c.sticking, c.size]);

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

  const style = c.catalogue.styles[c.style]?.params;
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
  /* The Hands row (Phase 14) shows with Sticking on or where the section
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
            <SongLine pattern={c.view[c.editing] ?? c.view.A} />
            {/* A fixed pattern is never edited in place (D26): the edit is a
                variation until it is saved, and undo back to the original
                takes the banner away. */}
            {c.doc.variationOf ? (
              <p className="title-credit variation-banner" role="status">
                You&rsquo;re making a variation of <b>{c.doc.variationOf}</b> — Save to keep it
              </p>
            ) : null}
            <div className="title-sub">
              <span className="chip">{styleLabel(c.catalogue.styles, c.style)}</span>
              <span className="chip brass">
                {c.bars} bar{c.bars === 1 ? '' : 's'}
              </span>
              <span className="chip">seed {String(c.view.A.seed).slice(-4)}</span>
              <span className="chip rust">
                Layer {c.level} · {layerNames[c.level]}
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
                  onPressedChange={(on) => {
                    c.setSticking(on);
                    // turned off, the row goes unless the section writes hands
                    if (!on) setHandsKept(null);
                  }}
                  title="Print the suggested hand and foot under each note, and show the Hands row for writing your own"
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
          </>
        )}

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
              beside the chart&rsquo;s Size, makes the cells bigger. From the Ghosted layer up, the
              same menu can cut the cell&rsquo;s beat into a tuplet — five, six, seven even notes
              where the grid has four. A tuplet shows as its beat&rsquo;s cells merged and cut into
              its notes, numbered; tap a note to set it, and hold one to give the beat back to the
              grid.
            </StudioHelp>
            {showHands ? (
              <>
                {' '}
                <StudioHelp title="Writing the hands">
                  The Hands row under the lanes is the sticking: tap a step for R, again for L, and
                  again to leave it to the drummer. Hold it (or right-click it) to keep a
                  flam&rsquo;s or drag&rsquo;s graces on the same stick, to write the rest of the
                  bar hand to hand from there, or to clear the bar. The chart prints what you write
                  and the drummer plays it. A hand that cannot reach its note — an L on the ride —
                  is struck through, and the drummer plays that step as if nothing were written.
                  Changing a note keeps the hands on every step that still has one.
                </StudioHelp>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
