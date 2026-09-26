'use client';

import { useCallback, useState } from 'react';
import { z } from 'zod';

import { apiClient, APIClientError } from '@/lib/api/client';
import { encodeWav, type Encoded } from '@/lib/app/breaks/audio/encode-wav';
import { logger } from '@/lib/logging';
import {
  type SampleList,
  type SampleUsage,
  type SampleView,
  sampleCreatedSchema,
  sampleUsageSchema,
  type YourKitView,
  yourKitViewSchema,
} from '@/lib/validations/samples';

/**
 * Your own samples and kits, in the Studio (D20).
 *
 * Seeded from what the page read server-side, so the Kit drawer is right on
 * first paint, and kept in step from the answers to each write rather than
 * re-read: every route answers with what changed (the sample and your usage,
 * the kit as it now is). The provider adds {@link YourSounds.kits} to the
 * catalogue it hands the console, so a slot you fill plays on the next bar.
 *
 * An upload is encoded in the browser first (`encodeWav`): whatever you pick
 * goes up as mono 16-bit 44.1 kHz WAV, and a file that cannot be one says why
 * before anything is sent. The server checks again and its refusal, if any, is
 * the sentence shown.
 */

export interface YourSounds {
  kits: YourKitView[];
  samples: SampleView[];
  usage: SampleUsage;
  /** A new, empty kit of yours; `null` if it could not be made (the toast says why). */
  createKit: (label?: string) => Promise<YourKitView | null>;
  renameKit: (id: string, label: string) => Promise<boolean>;
  deleteKit: (id: string) => Promise<boolean>;
  /** Encode `file`, upload it and put it in the slot. `''` when it worked, else the sentence to show. */
  uploadToSlot: (kitId: string, slot: string, file: File) => Promise<string>;
  clearSlot: (kitId: string, slot: string) => Promise<boolean>;
  deleteSample: (id: string) => Promise<boolean>;
}

const EMPTY: SampleList = {
  samples: [],
  usage: { count: 0, bytes: 0, maxCount: 0, maxBytes: 0 },
};

const deletedSampleSchema = z.object({ usage: sampleUsageSchema });

/** The error envelope's message, or a sentence of our own when there is none. */
const envelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ message: z.string() }).optional(),
});

function messageOf(error: unknown, fallback: string): string {
  return error instanceof APIClientError && error.code !== 'NETWORK_ERROR' && error.message
    ? error.message
    : fallback;
}

/**
 * POST the encoded sample. `apiClient` sends JSON only, so this is a plain
 * `fetch` with the same envelope read back through a schema.
 */
async function postSample(
  encoded: Extract<Encoded, { ok: true }>,
  slot: string,
  name: string
): Promise<z.infer<typeof sampleCreatedSchema> | string> {
  const form = new FormData();
  form.set('file', encoded.wav, 'sample.wav');
  form.set('slot', slot);
  form.set('name', name);
  let body: z.infer<typeof envelopeSchema>;
  try {
    const res = await fetch('/api/v1/samples', {
      method: 'POST',
      body: form,
      credentials: 'same-origin',
    });
    body = envelopeSchema.parse(await res.json());
  } catch (error) {
    logger.warn('Sample upload failed', { error: error instanceof Error ? error.message : error });
    return 'Could not upload that — check your connection and try again';
  }
  if (!body.success) return body.error?.message ?? 'That sample was refused';
  const created = sampleCreatedSchema.safeParse(body.data);
  return created.success ? created.data : 'The upload answered with something unexpected';
}

export function useYourSounds(
  initial: { kits?: YourKitView[]; samples?: SampleList },
  say: (message: string) => void
): YourSounds {
  const [kits, setKits] = useState<YourKitView[]>(() => initial.kits ?? []);
  const [samples, setSamples] = useState<SampleView[]>(() => (initial.samples ?? EMPTY).samples);
  const [usage, setUsage] = useState<SampleUsage>(() => (initial.samples ?? EMPTY).usage);

  const putKit = useCallback((kit: YourKitView) => {
    setKits((prev) => prev.map((k) => (k.id === kit.id ? kit : k)));
  }, []);

  /** PATCH a kit and take the answer; `''` or the sentence to show. */
  const patchKit = useCallback(
    async (id: string, body: Record<string, unknown>): Promise<string> => {
      try {
        putKit(yourKitViewSchema.parse(await apiClient.patch(`/api/v1/kits/${id}`, { body })));
        return '';
      } catch (error) {
        logger.warn('Kit change failed', { error: error instanceof Error ? error.message : error });
        return messageOf(error, 'Could not change the kit — try again');
      }
    },
    [putKit]
  );

  const createKit = useCallback(
    async (label?: string) => {
      try {
        const kit = yourKitViewSchema.parse(
          await apiClient.post('/api/v1/kits', { body: label ? { label } : {} })
        );
        setKits((prev) => [...prev, kit]);
        return kit;
      } catch (error) {
        say(messageOf(error, 'Could not make a kit — try again'));
        return null;
      }
    },
    [say]
  );

  const renameKit = useCallback(
    async (id: string, label: string) => {
      const err = await patchKit(id, { label });
      if (err) say(err);
      return !err;
    },
    [patchKit, say]
  );

  const deleteKit = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/api/v1/kits/${id}`);
        setKits((prev) => prev.filter((k) => k.id !== id));
        return true;
      } catch (error) {
        say(messageOf(error, 'Could not delete the kit — try again'));
        return false;
      }
    },
    [say]
  );

  const uploadToSlot = useCallback(
    async (kitId: string, slot: string, file: File) => {
      const encoded = await encodeWav(file);
      if (!encoded.ok) return encoded.message;

      const created = await postSample(encoded, slot, file.name);
      if (typeof created === 'string') return created;
      setSamples((prev) => [created.sample, ...prev]);
      setUsage(created.usage);

      const err = await patchKit(kitId, { slots: { [slot]: created.sample.id } });
      return err ? `Uploaded, but not put in the kit: ${err}` : '';
    },
    [patchKit]
  );

  const clearSlot = useCallback(
    async (kitId: string, slot: string) => {
      const err = await patchKit(kitId, { slots: { [slot]: null } });
      if (err) say(err);
      return !err;
    },
    [patchKit, say]
  );

  const deleteSample = useCallback(
    async (id: string) => {
      try {
        const { usage: after } = deletedSampleSchema.parse(
          await apiClient.delete(`/api/v1/samples/${id}`)
        );
        setSamples((prev) => prev.filter((s) => s.id !== id));
        setUsage(after);
        // the server emptied the slots that held it; so does what is shown
        setKits((prev) =>
          prev.map((k) => ({
            ...k,
            slots: Object.fromEntries(Object.entries(k.slots).filter(([, s]) => s.sampleId !== id)),
          }))
        );
        return true;
      } catch (error) {
        say(messageOf(error, 'Could not delete that sample — try again'));
        return false;
      }
    },
    [say]
  );

  return {
    kits,
    samples,
    usage,
    createKit,
    renameKit,
    deleteKit,
    uploadToSlot,
    clearSlot,
    deleteSample,
  };
}
