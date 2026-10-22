'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Embed, PROVIDER_NAMES } from '@/components/app/community/reference-embeds';
import { studioStyleHref } from '@/components/app/shell/studio-address';
import { Button } from '@/components/ui/button';
import type { ReferenceLink } from '@/lib/app/breaks/links';
import { type SongRow, TRANSCRIPTION_SITES } from '@/lib/app/lineage/songs';

/**
 * A drummer's songs on their page (Phase 15-c): title, band, record, year,
 * what the drums do, and whether the Studio plays it.
 *
 * A scored song opens in the Studio on the drummer's style with that song. An
 * unscored one is greyed and says so (D75). A song with a link plays here
 * through the same click-to-load embed a pattern's reference links use: the
 * row's ▶ or ♫ opens the player under it, and nothing is fetched from YouTube
 * or Spotify before that press.
 */
export function SongTable({ songs }: { songs: SongRow[] }) {
  const [open, setOpen] = useState<{ row: number; link: ReferenceLink } | null>(null);
  if (songs.length === 0) return null;
  const scored = songs.filter((s) => s.scored).length;

  return (
    <section aria-labelledby="songs" className="space-y-3">
      <div className="space-y-1">
        <h2 id="songs" className="text-lg font-semibold">
          Songs
        </h2>
        <p className="text-muted-foreground text-sm">
          {songs.length} {songs.length === 1 ? 'song' : 'songs'} picked for the drumming
          {scored > 0 ? `, ${scored} scored in the Studio` : ', none scored yet'}.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground border-b text-xs">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">
                Song
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                What the drums do
              </th>
              <th scope="col" className="py-2 font-medium">
                <span className="sr-only">Play</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {songs.map((s, i) => (
              <Row
                key={`${s.recordingId}/${s.title}`}
                song={s}
                playing={open?.row === i ? open.link : null}
                onPlay={(link) =>
                  setOpen((was) =>
                    was?.row === i && was.link.embedUrl === link.embedUrl ? null : { row: i, link }
                  )
                }
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        Pressing ▶ or ♫ loads content from YouTube or Spotify, who may set cookies.
      </p>
    </section>
  );
}

function Row({
  song,
  playing,
  onPlay,
}: {
  song: SongRow;
  playing: ReferenceLink | null;
  onPlay: (link: ReferenceLink) => void;
}) {
  const links = [song.youtube, song.spotify].filter((l): l is ReferenceLink => l !== null);
  const sameRecord = song.record === song.title;
  return (
    <>
      <tr
        className={`border-b align-top ${song.scored ? '' : 'text-muted-foreground'}`}
        data-scored={song.scored ? 'true' : 'false'}
      >
        <td className="py-2 pr-3">
          <span className={song.scored ? 'font-medium' : ''}>{song.title}</span>
          <span className="block text-xs">
            {song.artist}
            {sameRecord ? '' : ` · ${song.record}`} · {song.year}
          </span>
          <span className="mt-1 block text-xs">
            {song.scored ? (
              <Link
                href={studioStyleHref(song.scored.styleKey, song.scored.songKey)}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Scored · play it in the Studio
              </Link>
            ) : (
              'Not scored yet'
            )}
          </span>
        </td>
        <td className="py-2 pr-3">
          {song.drums}
          {song.transcriptions.length > 0 && (
            <span className="mt-1 block text-xs">
              Transcribed:{' '}
              {song.transcriptions.map((t, i) => (
                <span key={`${t.site}-${i}`}>
                  {i > 0 && ', '}
                  {t.url ? (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="underline underline-offset-4"
                    >
                      {TRANSCRIPTION_SITES[t.site] ?? t.site}
                    </a>
                  ) : (
                    (TRANSCRIPTION_SITES[t.site] ?? t.site)
                  )}
                </span>
              ))}
            </span>
          )}
        </td>
        <td className="py-2 whitespace-nowrap">
          {links.map((link) => {
            const provider = PROVIDER_NAMES[link.provider];
            const verb = link.provider === 'spotify' ? 'Listen on' : 'Play video from';
            return (
              <Button
                key={link.embedUrl}
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={playing?.embedUrl === link.embedUrl}
                aria-label={`${verb} ${provider}: ${song.title}`}
                onClick={() => onPlay(link)}
              >
                <span aria-hidden="true">{link.provider === 'spotify' ? '♫' : '▶'}</span>
              </Button>
            );
          })}
        </td>
      </tr>
      {playing && (
        <tr className="border-b">
          <td colSpan={3} className="py-2">
            <Embed
              provider={PROVIDER_NAMES[playing.provider]}
              kind={playing.provider === 'spotify' ? 'song' : 'video'}
              embedUrl={playing.embedUrl}
              canonicalUrl={playing.canonicalUrl}
              label={`${song.artist}: ${song.title}`}
              autoLoad
            />
          </td>
        </tr>
      )}
    </>
  );
}
