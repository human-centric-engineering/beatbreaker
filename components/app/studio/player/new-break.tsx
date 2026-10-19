'use client';

import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Shuffle } from 'lucide-react';
import { useId, useState } from 'react';

import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { SelectMenu } from '@/components/app/ui/select-menu';
import { CREATIVE_BANDS, creativeBand } from '@/lib/app/breaks/creativity';
import { cn } from '@/lib/utils';

/** "Any song" in the song menu: a select's value is a string, and none is not one. */
const ANY = '';

/**
 * The slider that sets how far a New may stray, with its four bands named
 * under it and the one it is in said in words: what a break at this setting
 * will be, before you press it.
 */
export function CreativitySlider() {
  const c = useStudio();
  const id = useId();
  const band = creativeBand(c.creativity);
  return (
    <div className="creativity" data-band={band.id}>
      <div className="creativity-hd">
        <label htmlFor={id} className="fieldlab">
          Creativity
        </label>
        <StudioHelp title="Creativity">
          Every New is written faithfully first, from the song&rsquo;s own figures or the
          style&rsquo;s. Creativity then decides what is done to it. <b>Faithful</b> leaves it as it
          is. <b>Inspired</b> makes one move a drummer might make on the night. <b>Adventurous</b>{' '}
          brings in a kindred drummer&rsquo;s cymbal part, or plays it another way — half-time, a
          displaced ride, three against four, toms for hats. <b>Experimental</b> borrows the hands
          or the feet of a drummer from somewhere else entirely and plays it another way on top.
          Whatever it does, the kick or the snare of the original is kept, and the stage says what
          was changed and what was kept. Undo takes a New back.
        </StudioHelp>
        <span className="creativity-band">{band.label}</span>
        <span className="creativity-num mono">{c.creativity}</span>
      </div>
      <input
        id={id}
        className="creativity-range"
        type="range"
        min={0}
        max={100}
        value={c.creativity}
        onChange={(e) => c.setCreativity(Number(e.target.value))}
        aria-valuetext={`${c.creativity}: ${band.label}`}
        style={{ ['--at' as string]: `${c.creativity}%` }}
      />
      <ol className="creativity-scale" aria-hidden="true">
        {CREATIVE_BANDS.map((b) => (
          <li key={b.id} className={cn(b.id === band.id && 'on')}>
            {b.label}
          </li>
        ))}
      </ol>
      <p className="creativity-blurb">{band.blurb}</p>
    </div>
  );
}

/**
 * New break, on the stage: the button rolls one, and the chevron beside it
 * opens what it will roll — which of the drummer's songs (or any), and how
 * creatively. The band it is set to is written on the button, so a New at
 * Experimental is never a surprise.
 */
export function NewBreak() {
  const c = useStudio();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const band = creativeBand(c.creativity);
  // the songs of the style on the stage: the drummer you are studying
  const stageStyle = c.view.A?.style ?? c.style;
  const songs = c.catalogue.styles[stageStyle]?.params.songs ?? [];
  const pinned = c.nextSong?.style === stageStyle ? c.nextSong.song : null;
  const songValue = pinned && songs.some((sg) => sg.key === pinned) ? pinned : ANY;

  return (
    <div className="bb newbreak" ref={setRoot}>
      <button
        type="button"
        className="newbreak-go"
        onClick={() => c.newBreak('both')}
        aria-keyshortcuts="N"
        title={`A new break: ${band.label.toLowerCase()} (N)`}
      >
        <Shuffle size={17} aria-hidden="true" />
        <span>New break</span>
        <span className={cn('newbreak-band', band.id)} aria-hidden="true">
          {band.label}
        </span>
      </button>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="newbreak-more"
            aria-label="Song and creativity for New break"
          >
            <ChevronDown size={16} />
          </button>
        </Popover.Trigger>
        <Popover.Portal container={root}>
          <Popover.Content
            className="player-pop newbreak-pop"
            side="bottom"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            aria-label="New break"
          >
            <div className="player-pop-hd">
              <span>New break</span>
            </div>
            <div className="player-pop-bd">
              {songs.length ? (
                <div className="field">
                  <span className="fieldlab">Song</span>
                  <SelectMenu
                    aria-label="Song for the next New"
                    value={songValue}
                    onValueChange={(v) =>
                      c.setNextSong(v === ANY ? null : { style: stageStyle, song: v })
                    }
                    options={[
                      { value: ANY, label: `Any of the ${songs.length} songs`, note: 'at random' },
                      ...songs.map((sg) => ({ value: sg.key, label: sg.title, text: sg.title })),
                    ]}
                  />
                </div>
              ) : null}
              <CreativitySlider />
              <button
                type="button"
                className="newbreak-roll"
                onClick={() => {
                  c.newBreak('both');
                  setOpen(false);
                }}
              >
                <Shuffle size={15} aria-hidden="true" /> Write it
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
