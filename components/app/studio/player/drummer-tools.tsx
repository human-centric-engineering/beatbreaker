'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import { Camera, Check, Crosshair, Settings2, Shuffle } from 'lucide-react';
import { useContext } from 'react';

import { PlayerPop, PlayerPortal } from '@/components/app/studio/player/player-pop';
import { Segmented } from '@/components/app/studio/segmented';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { Toggle } from '@/components/app/studio/toggle';
import { SelectMenu } from '@/components/app/ui/select-menu';
import { CAMERA_LABELS, CAMERA_VIEWS, type CameraView } from '@/lib/app/breaks/drummer/camera';
import { GRIP_CHOICES, type GripChoice } from '@/lib/app/breaks/drummer/grips';

/**
 * The camera: the set shots round the kit, and Re-centre to fly back to the
 * one you are on once you have dragged away from it. A menu of radio items,
 * so the shot you are on is ticked and the arrow keys walk the list.
 */
export function CameraMenu({
  view,
  onView,
  onRecentre,
}: {
  view: CameraView;
  onView: (view: CameraView) => void;
  onRecentre: () => void;
}) {
  const container = useContext(PlayerPortal);
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        <button
          type="button"
          className="player-tool"
          aria-label="Camera"
          title={`Camera: ${CAMERA_LABELS[view]}`}
        >
          <Camera size={18} />
          <span className="player-tool-face">{CAMERA_LABELS[view]}</span>
        </button>
      </Menu.Trigger>
      <Menu.Portal container={container}>
        <Menu.Content className="player-menu" side="top" align="end" sideOffset={10}>
          <Menu.Label className="player-menu-label">Camera</Menu.Label>
          <Menu.RadioGroup
            value={view}
            onValueChange={(v) => {
              const next = CAMERA_VIEWS.find((x) => x === v);
              if (next) onView(next);
            }}
          >
            {CAMERA_VIEWS.map((v) => (
              <Menu.RadioItem key={v} value={v} className="player-menu-item">
                <Menu.ItemIndicator className="player-menu-tick">
                  <Check size={14} />
                </Menu.ItemIndicator>
                {CAMERA_LABELS[v]}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
          <Menu.Separator className="player-menu-sep" />
          <Menu.Item className="player-menu-item" onSelect={onRecentre}>
            <Crosshair size={14} className="player-menu-tick" />
            Re-centre
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export interface DrummerSettings {
  hand: 'right' | 'left';
  setHand: (hand: 'right' | 'left') => void;
  grip: GripChoice;
  setGrip: (grip: GripChoice) => void;
  /** The hand away from the hats: the left on a right-handed kit. */
  offHand: 'right' | 'left';
  seeThrough: boolean;
  setSeeThrough: (on: boolean) => void;
  chart: boolean;
  setChart: (on: boolean) => void;
  /** Where the scrolling chart can be shown at all: not on a phone. */
  chartAllowed: boolean;
  onShuffle: () => void;
  /** Absent where the browser cannot draw the guide's hands. */
  onHowToHold?: () => void;
}

/** The drummer's own settings: how the kit is set up, how the sticks are held, how it is drawn. */
export function DrummerSettingsPop(s: DrummerSettings) {
  return (
    <PlayerPop label="Drummer settings" title="The drummer" icon={<Settings2 size={18} />} wide>
      <div className="field">
        <span className="fieldlab">Kit set up for</span>
        <Segmented
          label="Kit set up for"
          small
          options={[
            {
              value: 'right' as const,
              face: 'Right-handed',
              title: 'Hats and ride on the right hand',
            },
            {
              value: 'left' as const,
              face: 'Left-handed',
              title: 'Hats and ride on the left hand — the kit mirrored',
            },
          ]}
          value={s.hand}
          onChange={s.setHand}
        />
      </div>
      <div className="field">
        <span className="fieldlab">Grip</span>
        <div className="player-grip">
          <SelectMenu
            className="drummer-grip"
            aria-label="Grip"
            value={s.grip}
            onValueChange={(v) => {
              const next = GRIP_CHOICES.find((g) => g === v);
              if (next) s.setGrip(next);
            }}
            groups={[
              {
                label: 'Matched',
                options: [
                  { value: 'american', label: 'American', note: 'palms at 45°' },
                  { value: 'german', label: 'German', note: 'palms down' },
                  { value: 'french', label: 'French', note: 'thumbs up' },
                ],
              },
              {
                label: 'Traditional',
                options: [
                  { value: 'traditional', label: `Traditional (${s.offHand})`, note: 'palm up' },
                  { value: 'traditionalBoth', label: 'Traditional (both)', note: 'palms up' },
                ],
              },
            ]}
          />
          {s.onHowToHold ? (
            <button
              type="button"
              className="player-chip"
              title="How to hold the sticks in each grip, step by step, with the drummer's own hands"
              onClick={s.onHowToHold}
            >
              How to hold
            </button>
          ) : null}
        </div>
      </div>
      <div className="field">
        <span className="fieldlab">Show</span>
        <div className="btnrow">
          <Toggle
            className="player-chip"
            pressed={s.seeThrough}
            onPressedChange={s.setSeeThrough}
            title="Every kit in see-through acrylic, in its own colour, like Bonham's Vistalite"
          >
            See-through kit
          </Toggle>
          {s.chartAllowed ? (
            <Toggle
              className="player-chip"
              pressed={s.chart}
              onPressedChange={s.setChart}
              title="Show the chart scrolling with the drummer, with the section and the beat of the bar"
            >
              Scrolling chart
            </Toggle>
          ) : null}
          <button
            type="button"
            className="player-chip"
            title="Seat a different drummer at the kit"
            onClick={s.onShuffle}
          >
            <Shuffle size={13} aria-hidden="true" /> Shuffle drummer
          </button>
        </div>
      </div>
      <div className="player-pop-help">
        <StudioHelp title="The drummer">
          Drag to turn round the kit, scroll or pinch to zoom in (toward the pointer), and
          right-drag or two-finger drag to slide. The drummer plays exactly what you hear — swing,
          feel and Humanise included — and chooses its own sticking: cymbals on the lead hand, quick
          sixteenths on the hats hand to hand, fills alternating with a double where that keeps the
          arms from crossing, a flam&rsquo;s grace on the other hand. While a double-kick pattern
          plays a second pedal goes in, the hi-hat moves over to make room for it, and the left foot
          leaves the hats to play every other kick of a run. Every stroke is thrown by the wrist —
          the forearm starting the big ones — and the fingers keep the stick bouncing: ghost notes
          from an inch, accents from high up. The heavier the style, the more of every stroke is the
          arm and the more the body goes into the backbeat: a nod in funk, a headbang in metal. Grip
          sets how the sticks are held: German palms down, American at about 45°, French thumbs up,
          Traditional palm up in the web of the thumb, in the hand away from the hats or both. How
          to hold opens a guide to each grip, step by step. The scrolling chart puts the music in
          the top corner, on into the start of the next section, with the section and the beat of
          the bar (not on a phone). See-through kit makes any kit tinted acrylic, as Bonham&rsquo;s
          Amber Vistalite was. Pick a drummer&rsquo;s own style and their likeness sits in, as they
          looked in their prime; Shuffle drummer seats someone else until you change style. It is a
          jointed figure, not a recording of a real player.
        </StudioHelp>
        <span>About the drummer</span>
      </div>
    </PlayerPop>
  );
}
