'use client';

import { useState } from 'react';

import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { useSpeeds, useTableTop } from '@/components/app/studio/use-speeds';
import {
  parseVideoLink,
  VIDEO_PLATFORM_LABELS,
  VIDEO_RULE,
} from '@/lib/app/breaks/community/video-links';
import { layerName } from '@/lib/app/breaks/layers';
import type { PinTarget } from '@/lib/validations/pins';
import { SPEED_NOTE_MAX, type SpeedRecordView } from '@/lib/validations/speeds';

/**
 * _Your speeds_ in the Practise drawer (Phase 7C): record the fastest tempo
 * you can play the pattern on the stage well, at the layer you are on, and
 * see your progress and your place on its table.
 *
 * A speed is recorded against a pattern with an identity — a saved one, or
 * the famous break it came from — and never against a variation you have not
 * saved yet: a record on a published pattern is always for its fixed notes.
 * Nor against a famous break whose notes you have changed on the stage: the
 * record would count on the real break's table, for notes you did not play.
 *
 * The first time you record on a pattern with a public table, it asks
 * whether to list it, and the answer is kept as your default (the server
 * does that on the same request). After that there is one Save and a
 * checkbox that starts at your answer.
 */

/** How many of your latest records the drawer lists. */
export const RECENT_SHOWN = 5;

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

function tableUrl(
  target: PinTarget,
  sharing: { visibility: string; slug: string | null }
): string | null {
  if ('libraryEntryId' in target) {
    return `/api/v1/public/library-entries/${target.libraryEntryId}/speeds`;
  }
  return sharing.visibility === 'published' && sharing.slug
    ? `/api/v1/public/patterns/${sharing.slug}/speeds`
    : null;
}

export function SpeedsCard() {
  const c = useStudio();
  const target = c.stagePin;
  const { speeds, record, remove, version } = useSpeeds(target, c.say);
  const bpm = Math.round(c.bpm);
  const level = c.level;
  const url = target && speeds?.public ? tableUrl(target, c.doc.sharing) : null;
  const top = useTableTop(url, level, version);

  const [open, setOpen] = useState(false);
  const [video, setVideo] = useState('');
  const [note, setNote] = useState('');
  const [listed, setListed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const videoProblem = video.trim() && !parseVideoLink(video) ? VIDEO_RULE : null;
  const asking = !!speeds?.public && speeds.listSpeeds === 'ask';
  const listedNow = listed ?? speeds?.listSpeeds === 'list';

  const save = async (list?: boolean) => {
    if (videoProblem) return;
    setBusy(true);
    const ok = await record({
      bpm,
      level,
      ...(video.trim() ? { videoUrl: video.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(speeds?.public ? { listed: list ?? listedNow } : {}),
    });
    setBusy(false);
    if (ok) {
      setOpen(false);
      setVideo('');
      setNote('');
      setListed(null);
    }
  };

  const place = speeds?.places.find((p) => p.level === level);

  return (
    <div className="card">
      <div className="card-hd">
        <h3>Your speeds</h3>
        <StudioHelp title="Your speeds">
          The fastest tempo you can play this pattern <b>well</b>, at the layer you are on. Every
          speed is kept, with the date, so you can see yourself getting faster. On a published
          pattern or a famous break your best can go on its table, under your username. Speeds are
          self-reported; a video link is what backs one up.
        </StudioHelp>
      </div>
      <div className="card-bd">
        {!target ? (
          <p className="hint">Save this pattern to record your speeds on it.</p>
        ) : c.doc.variationOf ? (
          <p className="hint">
            You&apos;re making a variation. Save it to record speeds on it — a speed on “
            {c.doc.variationOf}” is for its own notes.
          </p>
        ) : (
          <>
            {place ? (
              <p className="speeds-place">
                You&apos;re <b>{ordinal(place.position)}</b> of {place.of} at {layerName(level)}.
              </p>
            ) : speeds?.public && !speeds.hasUsername ? (
              <p className="hint">Choose a username in Settings to appear on this table.</p>
            ) : null}

            {c.entryEdited ? (
              <p className="hint">
                You&apos;ve changed this famous break&apos;s notes. Undo back to them to mark a
                speed on it, or save your version to record speeds on that.
              </p>
            ) : null}

            {open && !c.entryEdited ? (
              <form
                className="speeds-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
                noValidate
              >
                <p className="speeds-now">
                  <b>{bpm} bpm</b> at {layerName(level)}
                </p>
                <div className="field">
                  <label htmlFor="bb-speed-video">
                    Video link{' '}
                    <StudioHelp title="Video link">
                      You playing it at this speed: YouTube or Vimeo (it can be played on the page),
                      or Instagram, TikTok or X (opened in a new tab). Optional — a speed with a
                      video gets a badge on the table. Default: none.
                    </StudioHelp>
                  </label>
                  <input
                    id="bb-speed-video"
                    type="url"
                    inputMode="url"
                    placeholder="https://www.youtube.com/watch?v=…"
                    value={video}
                    aria-invalid={!!videoProblem}
                    aria-describedby={videoProblem ? 'bb-speed-video-err' : undefined}
                    onChange={(e) => setVideo(e.target.value)}
                  />
                  {videoProblem ? (
                    <div id="bb-speed-video-err" className="hint err" role="alert">
                      {videoProblem}
                    </div>
                  ) : null}
                </div>
                <div className="field">
                  <label htmlFor="bb-speed-note">
                    Note{' '}
                    <StudioHelp title="Note">
                      A line for yourself — what felt shaky, what to try next. Only you see it. Up
                      to {SPEED_NOTE_MAX} characters. Default: none.
                    </StudioHelp>
                  </label>
                  <input
                    id="bb-speed-note"
                    type="text"
                    maxLength={SPEED_NOTE_MAX}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                {asking ? (
                  <div className="field">
                    <span className="fieldlab">Put it on the table?</span>
                    <p className="hint">
                      Your best goes on this pattern&apos;s public table, under your username.
                      We&apos;ll remember your answer for next time.
                    </p>
                    <div className="btnrow">
                      <button
                        type="button"
                        className="mini on"
                        disabled={busy || !!videoProblem}
                        onClick={() => void save(true)}
                      >
                        Save and list it
                      </button>
                      <button
                        type="button"
                        className="mini"
                        disabled={busy || !!videoProblem}
                        onClick={() => void save(false)}
                      >
                        Save, keep it off
                      </button>
                      <button type="button" className="mini ghost" onClick={() => setOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {speeds?.public ? (
                      <label className="speeds-check">
                        <input
                          type="checkbox"
                          checked={listedNow}
                          onChange={(e) => setListed(e.target.checked)}
                        />{' '}
                        On the public table
                      </label>
                    ) : null}
                    <div className="btnrow">
                      <button type="submit" className="mini on" disabled={busy || !!videoProblem}>
                        Save
                      </button>
                      <button type="button" className="mini ghost" onClick={() => setOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </form>
            ) : (
              <div className="btnrow">
                <button
                  type="button"
                  className="mini"
                  disabled={c.entryEdited}
                  onClick={() => setOpen(true)}
                >
                  Mark my speed · {bpm} bpm
                </button>
              </div>
            )}

            {speeds?.records.length ? <Progress records={speeds.records} /> : null}
            {speeds?.records.length ? (
              <Recent records={speeds.records} onDelete={(id) => void remove(id)} />
            ) : null}

            {url && top ? <TableTop rows={top} level={level} /> : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Your best per layer, and a line of every record at it, oldest to newest —
 * the progress. Only layers you have recorded at.
 */
function Progress({ records }: { records: SpeedRecordView[] }) {
  const byLevel = new Map<number, SpeedRecordView[]>();
  for (const r of [...records].reverse()) {
    byLevel.set(r.level, [...(byLevel.get(r.level) ?? []), r]);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  return (
    <ul className="speeds-progress" aria-label="Your best at each layer">
      {levels.map((level) => {
        const list = byLevel.get(level) ?? [];
        const best = Math.max(...list.map((r) => r.bpm));
        return (
          <li key={level}>
            <span className="speeds-layer">{layerName(level)}</span>
            <Sparkline values={list.map((r) => r.bpm)} />
            <span className="speeds-best">
              best <b>{best}</b>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A small line of tempos. Decorative: the best beside it says the number. */
function Sparkline({ values }: { values: number[] }) {
  const w = 80;
  const h = 18;
  if (values.length < 2) return <svg className="speeds-line" width={w} height={h} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 4) + 2;
      const y = h - 2 - ((v - min) / span) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="speeds-line" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Recent({
  records,
  onDelete,
}: {
  records: SpeedRecordView[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="field">
      <span className="fieldlab">Latest</span>
      <ul className="speeds-recent" aria-label="Your latest speeds">
        {records.slice(0, RECENT_SHOWN).map((r) => (
          <li key={r.id}>
            <span>
              <b>{r.bpm}</b> · {layerName(r.level)} · {r.recordedAt.slice(0, 10)}
              {r.video ? ' · video' : ''}
              {r.listed ? ' · listed' : ''}
            </span>
            <button
              type="button"
              className="mini"
              aria-label={`Delete ${r.bpm} bpm at ${layerName(r.level)} on ${r.recordedAt.slice(0, 10)}`}
              onClick={() => onDelete(r.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TableTop({
  rows,
  level,
}: {
  rows: Array<{
    id: string;
    position: number;
    username: string;
    bpm: number;
    video: { platform: keyof typeof VIDEO_PLATFORM_LABELS; url: string } | null;
  }>;
  level: number;
}) {
  return (
    <div className="field">
      <span className="fieldlab">Table · {layerName(level)}</span>
      {rows.length ? (
        <ol className="speeds-table">
          {rows.map((r) => (
            <li key={r.id}>
              <span className="speeds-pos">{r.position}</span>
              <span className="speeds-who">@{r.username}</span>
              <b>{r.bpm}</b>
              {r.video ? (
                <a
                  href={r.video.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="speeds-video"
                >
                  video
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="hint">Nobody is on it at this layer yet.</p>
      )}
      <p className="hint">Speeds are self-reported.</p>
    </div>
  );
}
