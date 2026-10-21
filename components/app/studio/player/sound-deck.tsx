'use client';

import { Drum } from 'lucide-react';

import { HumaniseDeck, KitDeck, KitHelp } from '@/components/app/studio/panels/kit-panel';
import { PlayerPop } from '@/components/app/studio/player/player-pop';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';

/**
 * The player's Sound button: which kit, the room it is in, and how loosely
 * the drummer plays it — the controls you reach for while listening, beside
 * the music they change. Tuning each drum, and your own samples, stay in the
 * Sound drawer, which needs the room.
 */
export function SoundPop() {
  const c = useStudio();
  return (
    <PlayerPop
      label="Sound"
      title="Sound"
      tip="Sound: the kit, and how human it plays"
      icon={<Drum size={18} />}
      face={c.catalogue.kits[c.kit]?.label}
      className="sound"
      wide
    >
      <div className="sound-deck">
        <section>
          <h4 className="player-pop-sub">
            Kit <KitHelp />
          </h4>
          <KitDeck withYourKit={false} />
        </section>
        <section>
          <h4 className="player-pop-sub">
            Humanise{' '}
            <StudioHelp title="Humanise">
              Small differences in when each hit lands and how hard, as a drummer plays: each limb
              drifts on its own, a ghost stays a ghost and an accent stays an accent. It sits on top
              of the style&apos;s feel, and the click stays on the grid. Subtle is 35, about 3.5 ms
              either way; at 100 the hands vary by about 10 ms and the feet by 8. Turn it off to
              check your own timing against the playback.
            </StudioHelp>
          </h4>
          <HumaniseDeck />
          <p className="hint">Tune each drum, and your own samples, in the Sound drawer.</p>
        </section>
      </div>
    </PlayerPop>
  );
}
