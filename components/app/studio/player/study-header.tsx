'use client';

import { WandSparkles } from 'lucide-react';
import { useMemo } from 'react';

import type { PatternSharing } from '@/components/app/breaks/use-break-console';
import { PinButton } from '@/components/app/studio/pin-button';
import { NewBreak } from '@/components/app/studio/player/new-break';
import { RandomPickButton } from '@/components/app/studio/player/random-pick';
import { StylePicker } from '@/components/app/studio/style-picker';
import { useStudio } from '@/components/app/studio/studio-provider';
import { usePickStyle } from '@/components/app/studio/use-pick-style';
import { SelectMenu } from '@/components/app/ui/select-menu';
import { pickerSections } from '@/lib/app/breaks/catalogue/picker';
import { publicPath } from '@/lib/app/breaks/community/visibility';
import { layerNamesFor } from '@/lib/app/breaks/layers';
import { parseReferenceLink, type StoredLink } from '@/lib/app/breaks/links';
import { songPartOf } from '@/lib/app/breaks/songs';
import type { Pattern } from '@/lib/app/breaks/types';

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
 * Which song the pattern plays, for a style that has songs — and the menu to
 * play another. Picking a song writes a new break of it straight away, and
 * every New after it stays on that song until "any song" is picked again;
 * picking the song already on the stage writes another take of it. The
 * section on the stage, for a song written in sections, and what the song is.
 *
 * Read off the pattern's own style, not the picker's, which may already be
 * set for the next one: the song picked is written in the style it is one
 * of, whatever the next New would otherwise be.
 */
function SongLine({ pattern }: { pattern: Pattern }) {
  const c = useStudio();
  const params = c.catalogue.styles[pattern.style]?.params;
  const part = songPartOf(params, pattern.song);
  const songs = params?.songs ?? [];
  if (!part && !songs.length) return null;
  const canPick = songs.length > 1;
  return (
    <div className="song-line">
      <span className="song-line-lead">Inspired by</span>
      {canPick ? (
        <SelectMenu
          className="song-pick"
          aria-label="Song inspiration"
          value={part?.song.key ?? ''}
          // the song on the stage picked again is another take of it
          onPick={(key) => {
            // playing, it goes back to the top and counts in to the new song
            c.restartFromTop();
            c.setNextSong({ style: pattern.style, song: key });
            c.newBreak('both', { style: pattern.style, song: key });
          }}
          options={songs.map((sg) => ({ value: sg.key, label: sg.title, text: sg.title }))}
        />
      ) : part ? (
        <b className="song-line-title">{part.song.title}</b>
      ) : null}
      {part ? (
        <span className="song-line-feel">
          {part.section ? <span className="song-line-part">{part.section.label}</span> : null}
          {part.song.feel}
        </span>
      ) : null}
    </div>
  );
}

/** What the twist on this break changed and what it kept, said where the break is. */
function TwistNote() {
  const c = useStudio();
  const t = c.twist;
  if (!t) return null;
  return (
    <p className="twist" role="status" data-band={t.band}>
      <WandSparkles size={15} aria-hidden="true" className="twist-mark" />
      <span>
        <b className="twist-band">{t.band}</b> {t.changed.join('; ')}.{' '}
        <span className="twist-kept">Kept {t.kept}.</span>
      </span>
    </p>
  );
}

/**
 * The top of the stage: who you are studying (and the crate, beside the name,
 * to study someone else), what the break is, what it is inspired by — and New
 * break, with Random under it.
 *
 * A drummer's style leads with the drummer, large: the name is what you came
 * for. Any other style leads with the style. The break's own name sits under
 * it with its ★ and its links; the song line under that, with the menu to
 * change song.
 */
export function StudyHeader({ children }: { children?: React.ReactNode }) {
  const c = useStudio();
  // beside the name: the crate, drummers first, to study someone else
  const { styles, styleGroups, kits } = c.catalogue;
  const sections = useMemo(
    () => pickerSections(styles, styleGroups, kits),
    [styles, styleGroups, kits]
  );
  const pickStyle = usePickStyle();
  const A = c.view.A;
  if (!A) return null;
  const row = c.catalogue.styles[A.style];
  const drummer = !!row?.params.drummer;
  const who = row?.params.label ?? A.style;
  const poly = (c.viewMode === 'both' ? A : c.view[c.viewMode])?.poly;
  const layerNames = layerNamesFor(!!poly, c.feelCross);
  const style = row?.params;

  return (
    <header className="study">
      <div className="study-main">
        <p className="study-eyebrow">{drummer ? 'Studying' : 'Style'}</p>
        <div className="study-who">
          <p className={drummer ? 'study-name drummer' : 'study-name'}>{who}</p>
          <StylePicker
            trigger="swap"
            sections={sections}
            value={A.style}
            onPick={(_section, key) => pickStyle(key)}
          />
        </div>
        <div className="title-row study-title">
          <h2>{A.name}</h2>
          <PinButton target={c.stagePin} label={A.name} />
          <LinkChips links={c.doc.details.links} />
        </div>
        <SongLine pattern={c.view[c.editing] ?? A} />
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
          {drummer ? null : <span className="chip">{who}</span>}
          <span className="chip brass">
            {c.bars} bar{c.bars === 1 ? '' : 's'}
          </span>
          <span className="chip">seed {String(A.seed).slice(-4)}</span>
          <span className="chip rust">
            Layer {c.level} · {layerNames[c.level]}
          </span>
          {style?.feel && c.feel ? <span className="chip teal">{style.feel.label}</span> : null}
        </div>
        <TwistNote />
      </div>
      <div className="study-side">
        <NewBreak />
        <RandomPickButton />
        {children}
      </div>
    </header>
  );
}
