'use client';

import { useMemo } from 'react';

import type { Tool } from '@/components/app/shell/tool-rail';
import { PolyrhythmsCard } from '@/components/app/studio/panels/polyrhythms-card';
import { RudimentsCard } from '@/components/app/studio/panels/rudiments-card';
import { ScoreCard } from '@/components/app/studio/panels/score-card';
import { FeelDeck } from '@/components/app/studio/player/feel-deck';
import { PLAYER_WIDE, useMedia } from '@/components/app/studio/player/use-media';
import { Segmented } from '@/components/app/studio/segmented';
import { StylePicker } from '@/components/app/studio/style-picker';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { usePickStyle } from '@/components/app/studio/use-pick-style';
import { Toggle } from '@/components/app/studio/toggle';
import { SelectMenu } from '@/components/app/ui/select-menu';
import { pickerSections } from '@/lib/app/breaks/catalogue/picker';
import { noStyleReason } from '@/lib/app/breaks/library';
import { BASE_LANES, PERC_INSTS, PERC_KEYS, PERC_LANES, laneName } from '@/lib/app/breaks/lanes';
import { METERS, METER_KEYS, meterOf, pulseInfo } from '@/lib/app/breaks/meter';
import { type CustomLanes, resolveLanes } from '@/lib/app/breaks/pattern';
import { songOf } from '@/lib/app/breaks/songs';
import { styleIn } from '@/lib/app/breaks/styles';

export function GeneratePanel({
  onOpenTool,
  onClose,
}: {
  onOpenTool?: (tool: Tool) => void;
  onClose?: () => void;
}) {
  const c = useStudio();
  const onPlayer = useMedia(PLAYER_WIDE);

  // picking a style writes a new break in it and closes the drawer
  const pickStyle = usePickStyle(onClose);
  const { styles, styleGroups, kits } = c.catalogue;

  const sections = useMemo(
    () => pickerSections(styles, styleGroups, kits),
    [styles, styleGroups, kits]
  );
  const styleRow = styles[c.style];
  const style = styleRow?.params;
  // the song on the stage, if it is this style's
  const nowSong = c.view.A?.style === c.style ? songOf(style, c.view.A.song) : undefined;
  const meter = meterOf(c.meter);
  const pulse = pulseInfo(meter);

  /* Turning a lane on rewrites the break in place, so this is what is on the
     screen rather than what the next one would get. The picker below reads the
     same roster while it is following a style, which is how you can see what
     the style asked for without taking it over first. */
  const roster = resolveLanes(
    style ? styleIn(style, c.meter) : undefined,
    c.lanesMode === 'custom' ? c.customLanes : null
  );
  const shownLanes: CustomLanes =
    c.lanesMode === 'custom'
      ? c.customLanes
      : {
          toms: roster.lanes.includes('t1'),
          p1: roster.lanes.includes('p1') ? roster.perc.p1 : undefined,
          p2: roster.lanes.includes('p2') ? roster.perc.p2 : undefined,
        };
  const extras = roster.lanes
    .filter((L) => !BASE_LANES.includes(L))
    .map((L) => laneName(L, roster.perc));

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <h3>Style</h3>
        </div>
        <div className="card-bd">
          <div className="field">
            <span className="fieldlab" id="bb-style-label">
              Style
            </span>
            <StylePicker
              id="bb-style"
              labelId="bb-style-label"
              sections={sections}
              value={c.style}
              onPick={(_section, key) => pickStyle(key)}
            />
            <div className="hint blurb">{style?.hint}</div>
            {style?.songs ? (
              <div className="hint songs">
                {nowSong ? (
                  <>
                    Playing style inspired by <b>{nowSong.title}</b> — {nowSong.feel}.{' '}
                  </>
                ) : null}
                Each New plays one of {style.songs.length} songs, at its own tempo and in its own
                time: {style.songs.map((sg) => sg.title).join(', ')}.
              </div>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="bb-meter">Time signature</label>
            <SelectMenu
              id="bb-meter"
              value={c.meter}
              onValueChange={c.setMeter}
              options={METER_KEYS.map((k) => ({ value: k, label: METERS[k].label }))}
            />
            <div className="hint">
              {meter.hint}
              {pulse ? (
                <>
                  {' '}
                  At {c.bpm} on the slider that is a {pulse.label} of{' '}
                  <b>{Math.round((c.bpm * 4) / pulse.steps)}</b>.
                </>
              ) : null}
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">Bars per section</span>
            <Segmented
              label="Bars per section"
              small
              options={[1, 2, 3, 4].map((n) => ({ value: n, face: String(n) }))}
              value={c.bars}
              onChange={c.setBars}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <h3>Kit</h3>
        </div>
        <div className="card-bd">
          {/* The kit is chosen in one place, Sound (E10). Here it is only named,
              because a style can ask for one and you should see that it did. */}
          <div className="field">
            <span className="fieldlab">Which kit</span>
            <div className="hint">
              {kits[c.kit]?.label ?? c.kit}
              {style?.kit === c.kit ? ', as the style asks. ' : ', your pick. '}
              {onOpenTool ? (
                <button type="button" className="textbtn" onClick={() => onOpenTool('kit')}>
                  Change it in Sound
                </button>
              ) : null}
            </div>
          </div>

          <div className="field">
            <span className="fieldlab">
              Kit lanes{' '}
              <StudioHelp title="Kit lanes">
                Toms are notated at the usual heights — high in the fourth space, mid on the fourth
                line, floor in the second. Percussion gets its own line above the staff. The foot
                follows the style either way: without it a jazz groove loses the only thing marking
                2 and 4.
              </StudioHelp>
            </span>
            <Segmented
              label="Kit lanes"
              small
              options={[
                { value: 'style' as const, face: "The style's" },
                { value: 'custom' as const, face: 'My own' },
              ]}
              value={c.lanesMode}
              onChange={(mode) => {
                if (mode === c.lanesMode) return;
                /* Switching to custom starts from what you can already
                   hear rather than from an empty kit: the picker has
                   been showing the style's roster all along, so taking
                   it over should not silently change the sound. */
                if (mode === 'custom') c.setCustomLanes(shownLanes);
                c.setLanesMode(mode);
              }}
            />
            {/* Shown while following the style too, disabled — it is how
                you see what the style asked for, and what you would be
                starting from if you took it over. */}
            <div className="lanepick" data-locked={c.lanesMode === 'style' ? '1' : '0'}>
              <label className="lanechk">
                <input
                  type="checkbox"
                  checked={!!shownLanes.toms}
                  onChange={(e) => c.setCustomLanes({ ...shownLanes, toms: e.target.checked })}
                />
                Toms
              </label>
              {PERC_LANES.map((L, i) => (
                <div className="row" key={L}>
                  <label htmlFor={`bb-perc-${L}`}>Perc {i + 1}</label>
                  <SelectMenu
                    id={`bb-perc-${L}`}
                    value={shownLanes[L] ?? ''}
                    onValueChange={(v) => c.setCustomLanes({ ...shownLanes, [L]: v || undefined })}
                    options={[
                      { value: '', label: 'Off' },
                      ...PERC_KEYS.map((k) => ({ value: k, label: PERC_INSTS[k].label })),
                    ]}
                  />
                </div>
              ))}
            </div>
            <div className="hint">
              {extras.length
                ? `On top of the kit: ${extras.join(', ')}.`
                : 'Kick, snare, hats, ride and crash.'}
            </div>
          </div>
        </div>
      </div>

      {/* on the player's bar where there is one: Feel, beside the music it changes */}
      {onPlayer ? null : (
        <div className="card">
          <div className="card-hd">
            <h3>Feel</h3>
          </div>
          <div className="card-bd">
            <FeelDeck />
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-hd">
          <h3>Regenerate</h3>
        </div>
        <div className="card-bd">
          <div className="field">
            <span className="fieldlab">Lock while regenerating</span>
            <div className="btnrow" role="group" aria-label="Lock while regenerating">
              {(['k', 's', 'h', 'bpm'] as const).map((k) => {
                const name =
                  k === 'bpm' ? 'Tempo' : k === 'k' ? 'Kick' : k === 's' ? 'Snare' : 'Hats';
                return (
                  <Toggle
                    key={k}
                    pressed={!!c.locks[k]}
                    onPressedChange={() => c.toggleLock(k)}
                    label={`Lock ${name}`}
                  >
                    {name}
                  </Toggle>
                );
              })}
            </div>
          </div>

          <div className="btnrow" style={{ marginTop: 6 }}>
            {c.letters.map((letter) => (
              <button
                key={letter}
                type="button"
                className="mini"
                onClick={() => {
                  if (!c.newBreak(letter)) c.say(noStyleReason(c.style, letter, 'regenerated'));
                }}
              >
                New {letter} only
              </button>
            ))}
            <button
              type="button"
              className="mini"
              onClick={() => {
                if (!c.buildBFromA())
                  c.say(noStyleReason(c.view.A?.style ?? c.style, 'A', 'built on for B'));
              }}
            >
              Build B from A
            </button>
          </div>
        </div>
      </div>

      <RudimentsCard onClose={onClose} />
      <PolyrhythmsCard onClose={onClose} />

      <ScoreCard />
    </>
  );
}
