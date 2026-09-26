'use client';

import { useEffect, useState } from 'react';

import { useStudio } from '@/components/app/studio/studio-provider';
import { SLOTS, SLOT_BY_ID } from '@/lib/app/breaks/kit';
import { MAX_SAMPLE_SECONDS, mb } from '@/lib/app/breaks/samples/limits';
import { DEFAULT_STUDIO_SETTINGS } from '@/lib/validations/studio-settings';
import type { YourKitView } from '@/lib/validations/samples';
import { cn } from '@/lib/utils';

/**
 * Your own kits and samples, in the Kit drawer (D20).
 *
 * Everything here is in your account, not in the browser: a sample you load
 * into a slot is uploaded, and a kit of yours plays the same on any device
 * you sign in on. The state is the provider's (`useYourSounds`); these only
 * show it and ask for changes.
 */

/** The kit of yours the picker is on, if it is one of yours. */
export function useCurrentYourKit(): YourKitView | undefined {
  const c = useStudio();
  return c.sounds.kits.find((k) => k.key === c.kit);
}

/**
 * Make a kit of your own, name the one you are on, or delete it.
 *
 * A new kit is picked once it is in the catalogue — the provider adds it when
 * the create answers, a render later, and `setKit` refuses a key the catalogue
 * does not have yet.
 */
export function YourKitControls() {
  const c = useStudio();
  const { say, sounds } = c;
  const mine = useCurrentYourKit();
  const [pick, setPick] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { setKit } = c;
  const { kits } = c.catalogue;

  useEffect(() => {
    if (!pick || !kits[pick]) return;
    setKit(pick);
    setPick(null);
  }, [pick, kits, setKit]);

  return (
    <div className="field">
      <div className="btnrow">
        <button
          type="button"
          className="mini"
          onClick={() => {
            void sounds.createKit().then((kit) => {
              if (!kit) return;
              setPick(kit.key);
              say('A new kit of your own — load a sample into each slot');
            });
          }}
        >
          New kit of your own
        </button>
        {mine ? (
          <button
            type="button"
            className="mini ghost"
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              setConfirming(false);
              void sounds.deleteKit(mine.id).then((ok) => {
                if (!ok) return;
                setKit(DEFAULT_STUDIO_SETTINGS.kit);
                say(`${mine.label} deleted — its samples are still in your account`);
              });
            }}
            onBlur={() => setConfirming(false)}
          >
            {confirming ? 'Delete it?' : 'Delete this kit'}
          </button>
        ) : null}
      </div>
      {mine ? (
        <>
          <label htmlFor="bb-your-kit-name" className="fieldlab" style={{ marginTop: 10 }}>
            Name
          </label>
          <input
            id="bb-your-kit-name"
            key={mine.id}
            defaultValue={mine.label}
            maxLength={80}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            onBlur={(e) => {
              const label = e.currentTarget.value.trim();
              if (!label || label === mine.label) {
                e.currentTarget.value = mine.label;
                return;
              }
              void sounds.renameKit(mine.id, label);
            }}
          />
        </>
      ) : null}
    </div>
  );
}

/** One file per slot of the kit of yours you are on: load, replace, or empty it. */
export function SampleSlots({ kit }: { kit: YourKitView }) {
  const { say, sounds } = useStudio();
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="field">
      <span className="fieldlab">Samples</span>
      <div className="slots">
        {SLOTS.map((slot) => {
          const filled = kit.slots[slot.id];
          return (
            <div key={slot.id} className={cn('slot', filled && 'filled')}>
              <b>
                {slot.label}
                {slot.opt ? <span className="opt">optional</span> : null}
              </b>
              <span className="fn mono">
                {busy === slot.id ? 'Uploading…' : (filled?.name ?? '—')}
              </span>
              <label className="mini">
                {filled ? 'Replace' : 'Load'}
                <input
                  type="file"
                  accept="audio/*"
                  hidden
                  disabled={busy !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setBusy(slot.id);
                    void sounds.uploadToSlot(kit.id, slot.id, file).then((err) => {
                      setBusy(null);
                      say(err || `${slot.label}: ${file.name}`);
                    });
                  }}
                />
              </label>
              {filled ? (
                <button
                  type="button"
                  className="mini ghost"
                  aria-label={`Clear ${slot.label}`}
                  disabled={busy !== null}
                  onClick={() => void sounds.clearSlot(kit.id, slot.id)}
                >
                  ✕
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="hint">
        Each file goes to your account as a mono WAV, so the kit plays on any device you sign in on.
        A single hit, up to {MAX_SAMPLE_SECONDS} seconds. A slot you leave empty falls through to
        the synthesised voice, so a half-filled kit still plays.
      </div>
    </div>
  );
}

/** Every sample in your account, how much of your allowance they use, and a way to delete one. */
export function YourSamples() {
  const { say, sounds } = useStudio();
  const { samples, usage } = sounds;
  const [confirming, setConfirming] = useState<string | null>(null);
  const share = usage.maxBytes ? Math.min(1, usage.bytes / usage.maxBytes) : 0;

  return (
    <div className="card">
      <div className="card-hd">
        <h3>Your samples</h3>
      </div>
      <div className="card-bd">
        <div className="meters" style={{ marginBottom: 12 }}>
          <div className="meter">
            <span>Used</span>
            <div
              className="track"
              role="meter"
              aria-label="Sample storage used"
              aria-valuemin={0}
              aria-valuemax={usage.maxBytes}
              aria-valuenow={usage.bytes}
              aria-valuetext={`${mb(usage.bytes)} of ${mb(usage.maxBytes)} MB`}
            >
              <div className="fill" style={{ width: `${Math.round(share * 100)}%` }} />
            </div>
            <em>{mb(usage.bytes)} MB</em>
          </div>
        </div>
        <div className="hint mono" style={{ marginBottom: 10 }}>
          {usage.count} of {usage.maxCount} samples · {mb(usage.bytes)} of {mb(usage.maxBytes)} MB
        </div>

        {samples.length ? (
          <div className="slots">
            {samples.map((s) => (
              <div key={s.id} className="slot filled">
                <b>{s.name}</b>
                <span />
                <button
                  type="button"
                  className="mini ghost"
                  aria-label={confirming === s.id ? `Delete ${s.name}?` : `Delete ${s.name}`}
                  onBlur={() => setConfirming(null)}
                  onClick={() => {
                    if (confirming !== s.id) {
                      setConfirming(s.id);
                      return;
                    }
                    setConfirming(null);
                    void sounds.deleteSample(s.id).then((ok) => {
                      if (ok) say(`${s.name} deleted`);
                    });
                  }}
                >
                  {confirming === s.id ? 'Delete?' : '✕'}
                </button>
                <span className="fn mono">
                  {SLOT_BY_ID[s.slot]?.label ?? s.slot} · {(s.durationMs / 1000).toFixed(1)}s ·{' '}
                  {Math.round(s.bytes / 1024)} KB
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="hint">Nothing uploaded yet.</div>
        )}
        <div className="hint">
          Deleting a sample takes it out of every kit of yours it is in. Your samples are yours
          alone — nobody else can play them.
        </div>
      </div>
    </div>
  );
}
