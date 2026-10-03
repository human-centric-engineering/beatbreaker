'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Transport, type TransportSnapshot, maxBpm } from '@/lib/app/breaks/audio/transport';
import type { CatalogueKit } from '@/lib/app/breaks/catalogue/types';
import { percussionSource } from '@/lib/app/breaks/catalogue/types';
import { withTuning } from '@/lib/app/breaks/kit';
import { DEFAULT_MIX } from '@/lib/app/breaks/lanes';
import { LAYER_NAMES, reducePattern } from '@/lib/app/breaks/layers';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import { logger } from '@/lib/logging';
import { DEFAULT_STUDIO_SETTINGS } from '@/lib/validations/studio-settings';

/** The lowest tempo the player offers, as the Studio's. */
const MIN_BPM = 40;
const LEVELS = [1, 2, 3, 4, 5] as const;

/** For the transport and pack events this player has nothing to show for. */
const noop = (): void => {};

/**
 * The read-only player on `/p/[slug]` (Phase 6, task 6.6): play, tempo and
 * layer — the Studio's transport and engine, without the editor.
 *
 * The pattern's document carries no kit (the kit is a setting, D19), so it
 * plays the default system kit, as a new account's Studio does. **Your own
 * samples are never involved**: nothing about publishing a pattern reaches
 * them (D20).
 *
 * The AudioContext is made on the first press of Play — a gesture, which is
 * what iOS asks for — and closed when the page is left.
 *
 * **The engine is not in the page's first bundle** (Phase 8, 8.5). It and the
 * kit loader are imported once the page has rendered, so the chart paints
 * without them and they are there long before anyone presses Play. A press
 * that beats them is ignored rather than started late outside the gesture,
 * which iOS would keep silent. If they fail to load (a tab left open across
 * a deploy, say), Play says the browser cannot play here, as it does with no
 * Web Audio, rather than doing nothing.
 */
export function PatternPlayer({
  payload,
  kits,
}: {
  payload: SharePayload;
  /** The system kits, from the catalogue: the default and the shared percussion. */
  kits: Record<string, CatalogueKit>;
}) {
  const doc = useMemo(() => breakDocFromPayload(payload), [payload]);
  const ceiling = maxBpm(doc.A.meter);
  const [bpm, setBpm] = useState(() => Math.round(doc.bpm));
  const [level, setLevel] = useState(doc.level);
  const [playing, setPlaying] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [engineFailed, setEngineFailed] = useState(false);

  const snapshot: TransportSnapshot = useMemo(
    () => ({
      patterns: { A: reducePattern(doc.A, level), B: reducePattern(doc.B, level) },
      arrangement: doc.arrangement,
      solo: null,
      bpm,
      swing: doc.swing,
      feel: DEFAULT_STUDIO_SETTINGS.feel,
      hats: DEFAULT_STUDIO_SETTINGS.hats,
      click: false,
      clickSub: 4,
      countIn: 0,
      ramp: 0,
      ceiling,
      mix: { ...DEFAULT_MIX },
      mute: {},
    }),
    [doc, level, bpm, ceiling]
  );
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const transportRef = useRef<Transport | null>(null);

  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | null = null;
    void Promise.all([
      import('@/lib/app/breaks/audio/engine'),
      import('@/lib/app/breaks/audio/packs'),
    ])
      .then(([{ BreakAudio, SourceStack }, { PackSource }]) => {
        if (cancelled) return;
        const audio = new BreakAudio();
        const packs = new PackSource(noop);
        audio.samples = new SourceStack([packs]);
        audio.percussion = percussionSource(kits);
        const kit = kits[DEFAULT_STUDIO_SETTINGS.kit] ?? Object.values(kits)[0] ?? null;
        audio.setKit(kit, withTuning(kit, undefined));
        const t = new Transport(audio, {
          getSnapshot: () => snapshotRef.current,
          onBpm: noop,
          onLoop: noop,
          onPaint: noop,
          onStop: () => setPlaying(false),
        });
        transportRef.current = t;
        teardown = () => {
          t.stop();
          audio.close();
          transportRef.current = null;
        };
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setEngineFailed(true);
        logger.warn('BeatBreaker: the audio engine did not load — the chart still reads', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [kits]);

  const toggle = () => {
    const t = transportRef.current;
    if (!t) {
      if (engineFailed) setUnsupported(true);
      return;
    }
    if (t.playing) {
      t.stop();
      return;
    }
    if (t.start()) setPlaying(true);
    else {
      setUnsupported(true);
      logger.warn('BeatBreaker: no Web Audio in this browser — the chart still reads');
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-4" aria-label="Player" role="group">
      <Button type="button" onClick={toggle}>
        {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
        {playing ? 'Stop' : 'Play'}
      </Button>

      <div className="flex flex-col gap-1">
        <Label htmlFor="player-tempo">Tempo: {bpm} bpm</Label>
        <input
          id="player-tempo"
          type="range"
          min={MIN_BPM}
          max={ceiling}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="player-layer">Layer</Label>
        <select
          id="player-layer"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
        >
          {LEVELS.map((n) => (
            <option key={n} value={n}>
              {n} · {LAYER_NAMES[n]}
            </option>
          ))}
        </select>
      </div>

      {unsupported ? (
        <p className="text-muted-foreground text-sm" role="status">
          This browser cannot play audio here — the chart still reads.
        </p>
      ) : null}
    </div>
  );
}
