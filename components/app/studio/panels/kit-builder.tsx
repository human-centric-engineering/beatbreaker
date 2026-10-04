'use client';

import { useId, useRef, useState } from 'react';

import { Slider } from '@/components/app/studio/panels/controls';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { useKitPieces } from '@/components/app/studio/use-kit-pieces';
import { SLOT_BY_ID } from '@/lib/app/breaks/kit';
import {
  BUILDER_ROWS,
  type BuilderRow,
  type PieceView,
  fillRow,
  pieceGroups,
  previewOf,
  rowNow,
  rowPan,
  rowSettings,
} from '@/lib/app/breaks/kit-builder';
import { DEFAULT_PAN } from '@/lib/app/breaks/lanes';
import { clamp } from '@/lib/app/breaks/rng';
import type { YourKitView } from '@/lib/validations/samples';
import { cn } from '@/lib/utils';

/**
 * Build a kit of your own from pieces (9.18), in the Kit drawer.
 *
 * One row per piece's role (`BUILDER_ROWS`): a picker of the pieces that can
 * fill it, grouped by the library they come from, a ▸ to hear it, and its
 * knobs behind _Adjust_. Choosing a piece plays it, from its own file, before
 * the kit has it. The kit is changed on the server and read back from the
 * answer, as every change to a kit of yours is.
 */

/** The `<select>` value for a row holding one of your samples rather than a piece. */
const SAMPLE = '__sample';

export function KitBuilder({ kit }: { kit: YourKitView }) {
  const { pieces, failed } = useKitPieces();

  return (
    <div className="card">
      <div className="card-hd">
        <h3>Build your kit</h3>
        <StudioHelp title="Build your kit">
          Each row is one drum or cymbal. Pick a piece from any of the recorded kits and it fills
          that row: a snare brings its ghost, cross-stick and rimshot where it has them. Anything a
          piece does not have plays the synthesised voice. A sample you loaded yourself shows here
          too, and the knobs work on it the same way.
        </StudioHelp>
      </div>
      <div className="card-bd">
        {failed ? (
          <div className="hint">The pieces did not load. Close the drawer and try again.</div>
        ) : null}
        <div className="build-rows">
          {BUILDER_ROWS.map((row) => (
            <BuildRow key={row.id} kit={kit} row={row} pieces={pieces} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** What the knobs show while one is being dragged, before the kit has it. */
interface Draft {
  level?: number;
  tune?: number;
  decay?: number;
  pan?: number;
}

function BuildRow({
  kit,
  row,
  pieces,
}: {
  kit: YourKitView;
  row: BuilderRow;
  pieces: PieceView[] | null;
}) {
  const c = useStudio();
  const { say, sounds } = c;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  // the drag's last value, for the commit that follows it in the same gesture
  const latest = useRef<Draft>({});

  const now = rowNow(kit, row);
  const piece = now.piece ? pieces?.find((p) => p.key === now.piece) : undefined;
  const groups = pieces ? pieceGroups(pieces, row) : [];
  const lane = row.lanes[0];
  const pan = rowPan(kit, row) ?? (lane ? DEFAULT_PAN[lane] : 0);
  const shown = { ...now.settings, pan, ...draft };
  const voice = SLOT_BY_ID[row.slots[0]]?.voice ?? 'k';
  const value = now.piece ?? (now.entry ? SAMPLE : '');
  const tuned =
    now.settings.level !== 1 ||
    now.settings.tune !== 0 ||
    now.settings.decay !== 1 ||
    rowPan(kit, row) !== undefined;

  /** Play a piece from its own file, with these settings; else the kit's own voice for the row. */
  const hear = (p: PieceView | undefined, s: { level: number; tune: number; decay: number }) => {
    const preview = p ? previewOf(p, row) : null;
    if (!preview) {
      c.audition(voice, voice === 't' || voice === 'c' ? row.slots[0] : undefined);
      return;
    }
    const gain = clamp(0.95 / Math.max(preview.velocity, 0.01), 0.25, 1.8) * preview.trim * s.level;
    void c
      .previewSample(preview.url, voice, { gain, tune: s.tune, decay: s.decay })
      .then((played) => {
        if (!played) say(`Could not play ${p?.label ?? row.label}`, { error: true });
      });
  };

  const choose = (key: string) => {
    if (key === SAMPLE) return;
    const next = key ? pieces?.find((p) => p.key === key) : undefined;
    if (key && !next) return;
    if (next) hear(next, now.settings);
    void sounds
      .changeKit(kit.id, { slots: fillRow(row, next ?? null, now.settings) })
      .then((ok) => {
        if (ok) say(next ? `${row.label}: ${next.label}` : `${row.label}: synthesised`);
      });
  };

  const drag = (d: Draft) => {
    latest.current = { ...latest.current, ...d };
    setDraft(latest.current);
  };

  const commitSettings = () => {
    const moved = latest.current;
    latest.current = {};
    // a key let go on a slider that did not move is not a change
    if (moved.level === undefined && moved.tune === undefined && moved.decay === undefined) return;
    const settings = { ...now.settings, ...moved };
    void sounds
      .changeKit(kit.id, {
        slots: rowSettings(kit, row, {
          level: settings.level,
          tune: settings.tune,
          decay: settings.decay,
        }),
      })
      .finally(() => setDraft({}));
    hear(piece, settings);
  };

  const commitPan = () => {
    const p = latest.current.pan;
    latest.current = {};
    if (p === undefined) return;
    void sounds
      .changeKit(kit.id, { pan: Object.fromEntries(row.lanes.map((l) => [l, p])) })
      .finally(() => setDraft({}));
  };

  const reset = () => {
    void sounds
      .changeKit(kit.id, {
        slots: rowSettings(kit, row, {}),
        ...(row.lanes.length ? { pan: Object.fromEntries(row.lanes.map((l) => [l, null])) } : {}),
      })
      .then((ok) => {
        if (ok) say(`${row.label} reset to the recording`);
      });
  };

  return (
    <div className={cn('build-row', now.entry && 'filled')}>
      <label htmlFor={id} className="fieldlab">
        {row.label}
      </label>
      <div className="pick">
        <select id={id} value={value} onChange={(e) => choose(e.target.value)}>
          <option value="">None — synthesised</option>
          {now.entry && 'sampleId' in now.entry ? (
            <option value={SAMPLE}>Your sample: {now.entry.name}</option>
          ) : null}
          {/* the kit's piece before the list has loaded, so the picker shows what is there */}
          {now.piece && !piece && now.entry && 'label' in now.entry ? (
            <option value={now.piece}>{now.entry.label}</option>
          ) : null}
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.pieces.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          className="mini"
          aria-label={`Hear the ${row.label.toLowerCase()}`}
          onClick={() => hear(piece, now.settings)}
        >
          ▸
        </button>
        <button
          type="button"
          className="mini ghost"
          aria-expanded={open}
          aria-controls={`${id}-knobs`}
          onClick={() => setOpen((o) => !o)}
        >
          Adjust
        </button>
      </div>
      {open ? (
        <div id={`${id}-knobs`} className="knobs">
          {now.entry ? (
            <>
              <Slider
                label="Level"
                value={Math.round(shown.level * 100)}
                min={0}
                max={200}
                suffix="%"
                onChange={(n) => drag({ level: n / 100 })}
                onCommit={commitSettings}
                help="How loud this row plays against the rest of the kit. 100% is the recording as it was level-matched to the others."
              />
              <Slider
                label="Tune"
                value={shown.tune}
                min={-1200}
                max={1200}
                step={10}
                format={(n) => `${n > 0 ? '+' : ''}${n}¢`}
                onChange={(n) => drag({ tune: n })}
                onCommit={commitSettings}
                help="Cents up or down, an octave either way. Pitch and length move together, as they do when you tune a real drum: lower is longer."
              />
              <Slider
                label="Decay"
                value={Math.round(shown.decay * 100)}
                min={20}
                max={100}
                suffix="%"
                onChange={(n) => drag({ decay: n / 100 })}
                onCommit={commitSettings}
                help="How much of the recording rings. Below 100% the hit is faded out early, which tightens a boomy kick or a long cymbal."
              />
            </>
          ) : (
            <div className="hint">Nothing in this row yet, so it plays the synthesised voice.</div>
          )}
          {lane ? (
            <Slider
              label="Pan"
              value={Math.round(shown.pan * 100)}
              min={-100}
              max={100}
              format={(n) => (n === 0 ? 'Centre' : n < 0 ? `L ${-n}` : `R ${n}`)}
              onChange={(n) => drag({ pan: n / 100 })}
              onCommit={commitPan}
              help="Where this row sits, left to right, as you hear it from the stool. Out front, in the Kit card, mirrors it."
            />
          ) : (
            <div className="hint">The splash pans with the crash.</div>
          )}
          <div className="btnrow">
            <button type="button" className="mini ghost" disabled={!tuned} onClick={reset}>
              Reset to kit
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
