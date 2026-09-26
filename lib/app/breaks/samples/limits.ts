/**
 * What one sample may be (D20). Shared by the browser, which checks before it
 * uploads so you hear why at once, and the server, which checks again because
 * anyone can post to the API.
 *
 * How many samples an account may keep, and how many bytes, are env settings
 * (`SAMPLES_MAX_COUNT`, `SAMPLES_MAX_BYTES`) read on the server only, so
 * production can move them without a release.
 */

/** A one-shot, not a loop. */
export const MAX_SAMPLE_SECONDS = 12;

/**
 * The largest WAV the server stores. Twelve seconds of mono 16-bit 44.1 kHz is
 * about 1.06 MB, so this is headroom, not a second duration limit.
 */
export const MAX_SAMPLE_BYTES = 1.5 * 1024 * 1024;

/**
 * The largest file the browser will try to decode. Well past any one-shot in
 * any format, and short of what would stall the tab decoding it.
 */
export const MAX_PICKED_BYTES = 32 * 1024 * 1024;

/** A kit's key when it is yours. No system kit may use this prefix (a seed test says so). */
export const YOUR_KIT_KEY_PREFIX = 'yours-';

/** How many kits of your own an account may keep. */
export const MAX_YOUR_KITS = 20;

/** Megabytes, to one decimal place, for messages and the usage meter. */
export function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** Where a sample's audio is served, owner-checked. Never a storage URL. */
export function sampleAudioUrl(id: string): string {
  return `/api/v1/samples/${id}/audio`;
}
