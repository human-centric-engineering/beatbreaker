'use client';

import { useState } from 'react';

import type { StyleOption } from '@/components/app/account/about-you-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { APIClientError, apiClient } from '@/lib/api/client';
import {
  ABILITIES,
  ABILITY_LABELS,
  type Ability,
  MAX_STYLES,
  PURPOSES,
  PURPOSE_LABELS,
  type Purpose,
} from '@/lib/validations/drummer-about';

/**
 * Home's three questions (Phase 7B, task 7B.7): what you use BeatBreaker for,
 * how well you play, and your styles. Offered once — answering or skipping
 * both record it (`asked: true`), and Home stops offering it. Everything else
 * about you, and what is public, is in Settings.
 */
export function AboutCard({ styles }: { styles: StyleOption[] }) {
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [ability, setAbility] = useState<Ability | ''>('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (gone) return null;

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await apiClient.put('/api/v1/drummer-about', { body: { ...body, asked: true } });
      setGone(true);
    } catch (e) {
      setError(e instanceof APIClientError ? e.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = <T,>(list: T[], item: T, on: boolean): T[] =>
    on ? [...list, item] : list.filter((v) => v !== item);

  return (
    <Card aria-labelledby="about-card-title">
      <CardHeader>
        <CardTitle id="about-card-title">Three quick questions</CardTitle>
        <CardDescription>
          So BeatBreaker starts you in the right place. Only you see the answers unless you make
          them public in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <fieldset className="space-y-1" disabled={busy}>
          <legend className="text-sm font-medium">What are you here for?</legend>
          {PURPOSES.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={purposes.includes(p)}
                onCheckedChange={(on) => setPurposes((list) => toggle(list, p, on))}
              />
              {PURPOSE_LABELS[p]}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-1" disabled={busy}>
          <legend className="text-sm font-medium">How well do you play?</legend>
          <div className="flex flex-wrap gap-2">
            {ABILITIES.map((a) => (
              <Button
                key={a}
                type="button"
                size="sm"
                variant={ability === a ? 'default' : 'outline'}
                aria-pressed={ability === a}
                onClick={() => setAbility((was) => (was === a ? '' : a))}
              >
                {ABILITY_LABELS[a]}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1" disabled={busy}>
          <legend className="text-sm font-medium">
            What do you like to play? (up to {MAX_STYLES})
          </legend>
          <div className="grid gap-1 sm:grid-cols-3">
            {styles.map((s) => {
              const on = chosen.includes(s.key);
              return (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={on}
                    disabled={!on && chosen.length >= MAX_STYLES}
                    onCheckedChange={(next) => setChosen((list) => toggle(list, s.key, next))}
                  />
                  {s.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={() => void send({ purposes, styles: chosen, ...(ability ? { ability } : {}) })}
        >
          Save
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void send({})}>
          Skip
        </Button>
      </CardFooter>
    </Card>
  );
}
