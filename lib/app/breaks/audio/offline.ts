/**
 * The browser's `OfflineAudioContext`, as a factory — or null where there is
 * none. A render takes the factory as an argument, so it tests without a
 * browser; this is the one place the real constructor is reached for.
 */

export type MakeOffline = (
  channels: number,
  length: number,
  sampleRate: number
) => OfflineAudioContext;

export function browserOffline(): MakeOffline | null {
  if (typeof OfflineAudioContext === 'undefined') return null;
  return (channels, length, sampleRate) => new OfflineAudioContext(channels, length, sampleRate);
}
