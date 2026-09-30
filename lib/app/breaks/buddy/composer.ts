import { isGrooveScribeUrl } from '@/lib/app/breaks/groove-scribe';
import type { SharePayload } from '@/lib/app/breaks/schema';

/**
 * What BeatBuddy's composer does before a message leaves (§6, _Reading
 * patterns in_). Client-safe and pure.
 *
 * A BeatBreaker `#b=` link and a Groove Scribe link are read by the import
 * endpoint, deterministically, and put on the stage. The model is then told
 * what arrived rather than handed the link, since it cannot fetch one. A
 * `/p/` link is left in the message: reading it needs the database, which is
 * `open_pattern`'s job. Any other URL stays as text, and BeatBuddy says what it
 * can read instead.
 */

/** The first link in a message the import endpoint reads, or null. */
export function findImportLink(text: string): string | null {
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const url = match[0].replace(/[).,;:!?]+$/, '');
    if (isGrooveScribeUrl(url) || url.includes('#b=')) return url;
  }
  return null;
}

/** Bytes as the base64 the stream and import endpoints take. */
export function encodeBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** A MIDI file, by type or by name — browsers disagree on the type. */
export function isMidiFile(file: { name: string; type: string }): boolean {
  return /^audio\/(midi|x-midi|mid)$/.test(file.type) || /\.(mid|midi|smf)$/i.test(file.name);
}

/** "4 bars of 4/4 at 112 bpm" — section A of an imported pattern, as a drummer says it. */
export function describeImported(doc: SharePayload): string {
  const bars = doc.A.b.length;
  return `${bars} bar${bars === 1 ? '' : 's'} of ${doc.A.mt ?? '4/4'} at ${Math.round(doc.bpm)} bpm`;
}

/** What BeatBuddy is told about something the composer imported, ahead of the message. */
export function importNote(what: string, doc: SharePayload): string {
  return `(I opened ${what} in the Studio: ${describeImported(doc)}.)`;
}

/** Shown in an empty conversation — the brief's five requests, in a drummer's words. */
export const SUGGESTED_PROMPTS = [
  'Write me a new funk groove',
  'Make this a bossa nova',
  'Take the ghost notes out of bar 2',
  'Tidy this up',
  'Why is this hard to play?',
] as const;
