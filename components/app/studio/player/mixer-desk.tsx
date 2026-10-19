'use client';

import { SlidersVertical } from 'lucide-react';

import { PlayerPop } from '@/components/app/studio/player/player-pop';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { LANE_DEFS, laneName, mixLanes } from '@/lib/app/breaks/lanes';
import { patternsOf } from '@/lib/app/breaks/sections';
import type { LaneKey } from '@/lib/app/breaks/types';
import { cn } from '@/lib/utils';

/** A strip is narrow: the lane's name, shortened to what fits under a fader. */
const SHORT: Partial<Record<LaneKey, string>> = {
  k: 'Kick',
  s: 'Snare',
  h: 'Hats',
  r: 'Ride',
  c: 'Crash',
  t1: 'Tom 1',
  t2: 'Tom 2',
  t3: 'Floor',
  hf: 'Hat ft',
};

/**
 * The mixer as a desk: a channel strip per lane, its fader upright, Mute and
 * Solo under it, and a lamp at its head that lights as the lane plays — so
 * the lane you are about to pull down is the one you can see firing.
 *
 * The same state as ever (D23, D39): a fader is the lane channel's level,
 * Solo silences every lane not soloed, Mute still wins, and a fader moved is
 * yours until "Back to the style".
 */
export function MixerDesk() {
  const c = useStudio();
  const lanes = c.view.A ? mixLanes(...patternsOf(c.view).map((p) => p.lanes)) : [];
  const pos = c.position && !c.position.count ? c.position : null;

  return (
    <div className="desk-wrap">
      <div className="desk" role="group" aria-label="Mixer channels">
        {lanes.map((lane) => {
          const name = laneName(lane, c.view.A?.perc);
          const level = Math.round((c.mix[lane] ?? 1) * 100);
          const lit = !!pos?.bar?.[lane]?.[pos.slot];
          return (
            <div
              key={lane}
              className={cn(
                'strip',
                c.mute[lane] && 'muted',
                c.laneSolo[lane] && 'soloed',
                lit && 'lit'
              )}
              style={{ ['--lane' as string]: LANE_DEFS[lane].color }}
            >
              <i className="strip-lamp" aria-hidden="true" />
              <span className="strip-val mono" aria-hidden="true">
                {level}
              </span>
              <input
                className="strip-fader"
                type="range"
                min={0}
                max={130}
                value={level}
                onChange={(e) => c.setLaneMix(lane, Number(e.target.value) / 100)}
                aria-label={name}
                aria-orientation="vertical"
              />
              <div className="strip-btns">
                <Toggle
                  className="strip-btn mute"
                  pressed={!!c.mute[lane]}
                  onPressedChange={() => c.toggleMute(lane)}
                  label={`Mute ${name}`}
                  title={`Mute ${name} — play it yourself`}
                >
                  M
                </Toggle>
                <Toggle
                  className="strip-btn solo"
                  pressed={!!c.laneSolo[lane]}
                  onPressedChange={() => c.toggleSolo(lane)}
                  label={`Solo ${name}`}
                  title={`Solo ${name} — hear it alone`}
                >
                  S
                </Toggle>
              </div>
              <span className="strip-name" title={name}>
                {SHORT[lane] ?? name}
              </span>
            </div>
          );
        })}
      </div>
      <div className="desk-ft">
        <StudioHelp title="Mixer">
          Mute a limb to play it yourself, or Solo one to hear it alone — with any lane soloed, only
          soloed lanes sound, and Mute still wins. Faders start where the style puts them — a few
          styles push a lane down because something else is the music and that lane was sitting on
          it. Move one and it is yours until you hit <b>Back to the style</b>. The lamp at the top
          of a strip lights as its lane plays.
        </StudioHelp>
        <span className="desk-spacer" />
        {Object.keys(c.mixTouched).length ? (
          <button type="button" className="player-chip" onClick={c.resetMix}>
            Back to the style
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MixerPop() {
  return (
    <PlayerPop label="Mixer" title="Mixer" icon={<SlidersVertical size={18} />} wide>
      <MixerDesk />
    </PlayerPop>
  );
}
