'use client';

import { AudioWaveform } from 'lucide-react';

import { Slider } from '@/components/app/studio/panels/controls';
import { PlayerPop } from '@/components/app/studio/player/player-pop';
import { useStudio } from '@/components/app/studio/studio-provider';
import { HAT_SHAPE } from '@/lib/app/breaks/feel';

/**
 * How the break is played rather than what is written: the swing, the hi-hat
 * dynamics and the style's off-grid feel. Each one changes what you hear on
 * the next hit, so they sit beside the music — on the player's bar, and in the
 * Generate drawer on a phone, where there is no bar.
 *
 * The readouts quote the shapes back as numbers. A percentage on a slider says
 * how much of the shape is applied; it does not say what the shape *is*. These
 * read the same tables playback reads, so what the deck claims and what the
 * kit does cannot drift apart.
 */
export function FeelDeck() {
  const c = useStudio();
  const style = c.catalogue.styles[c.style]?.params;

  const hatRead = ((): string => {
    if (c.hats === 0) return 'every hat the same weight — machine-even, accents and wobble off';
    const depth = c.hats / 100;
    const pc = (step: number) => Math.round((1 - (1 - HAT_SHAPE[step]) * depth) * 100);
    return `beat ${pc(0)}% · “and” ${pc(2)}% · “e” and “a” ${pc(1)}% · written accents on top`;
  })();

  const feelRead = ((): string => {
    const f = style?.feel;
    if (!f) return '';
    if (c.feel === 0) return 'straight — every hit lands on the grid';
    // a feel is written in sixteenths, whatever the meter's step is
    const step = 60 / c.bpm / 4;
    const ms = (v: number | [number, number] | undefined): string => {
      const n = Array.isArray(v) ? v[1] : (v ?? 0);
      const x = Math.round(n * step * 1000 * (c.feel / 100));
      return `${x > 0 ? '+' : ''}${x} ms`;
    };
    return `kick ${ms(f.k)} · snare ${ms(f.s)} · off-16th hats ${ms(f.h)}`;
  })();

  return (
    <div className="feel-deck">
      <Slider
        label={swingName(style?.swingUnit)}
        value={c.swing}
        onChange={c.setSwing}
        suffix="%"
        hint={
          c.swingYours
            ? 'Yours: a new pattern keeps it. Pick a style to hand it back.'
            : 'Set by the style: each new pattern picks a fresh swing in its range.'
        }
      />
      {style?.feel ? (
        <>
          <Slider
            label="Off-grid feel"
            value={c.feel}
            onChange={c.setFeel}
            max={150}
            suffix="%"
            help="Drag it to 0 to hear the same notes quantised. The click and the playhead never move — the gap between them and the kit is the feel."
          />
          <div className="hint mono feel-read">{feelRead}</div>
        </>
      ) : null}
      <Slider
        label="Hi-hat dynamics"
        value={c.hats}
        onChange={c.setHats}
        max={150}
        suffix="%"
        hint={hatRead}
      />
    </div>
  );
}

/** The swing slider's name: a shuffle for a style that swings its eighths. */
function swingName(unit: number | undefined): string {
  return unit === 8 ? 'Shuffle (8ths)' : 'Swing (16ths)';
}

/** The player's Feel button: the swing on its face, the deck above the bar. */
export function FeelPop() {
  const c = useStudio();
  const unit = c.catalogue.styles[c.style]?.params.swingUnit;
  return (
    <PlayerPop
      label="Feel"
      title="Feel"
      tip="Feel: straight, swing or shuffle"
      icon={<AudioWaveform size={18} />}
      face={c.swing > 0 ? `${unit === 8 ? 'Shuffle' : 'Swing'} ${c.swing}%` : 'Straight'}
      className="feel"
    >
      <FeelDeck />
    </PlayerPop>
  );
}
