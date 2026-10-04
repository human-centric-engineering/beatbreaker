/**
 * Playing the break out of a MIDI port, live: whether the browser can at
 * all (Phase 8, 8.5), opening a port and the sentence for each way that
 * fails, and what a hit sends, on which clock.
 *
 * @see lib/app/breaks/audio/midi-out.ts
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { MidiOut, midiOutSupported } from '@/lib/app/breaks/audio/midi-out';
import { midiVelocity } from '@/lib/app/breaks/perform';

function withMidi(requestMIDIAccess: unknown) {
  vi.stubGlobal('navigator', { requestMIDIAccess });
}

function port(name: string | null = 'Module') {
  return { name, send: vi.fn() };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('midiOutSupported', () => {
  it('is false with no Web MIDI, as in Safari and on iOS', () => {
    vi.stubGlobal('navigator', {});
    expect(midiOutSupported()).toBe(false);
  });

  it('is true when the browser offers requestMIDIAccess', () => {
    withMidi(() => Promise.resolve({ outputs: new Map() }));
    expect(midiOutSupported()).toBe(true);
  });
});

describe('MidiOut.connect', () => {
  it('says the browser has no Web MIDI', async () => {
    vi.stubGlobal('navigator', {});
    expect(await new MidiOut().connect()).toEqual({
      name: '',
      error: 'This browser has no Web MIDI',
    });
  });

  it('says permission was refused when access is denied', async () => {
    withMidi(() => Promise.reject(new Error('denied')));
    expect(await new MidiOut().connect()).toEqual({ name: '', error: 'MIDI permission refused' });
  });

  it('says there are no outputs when none are connected', async () => {
    withMidi(() => Promise.resolve({ outputs: new Map() }));
    const out = new MidiOut();
    expect(await out.connect()).toEqual({ name: '', error: 'No MIDI outputs found' });
    expect(out.name).toBe('');
  });

  it('takes the first output and names it, or calls it MIDI out when it has no name', async () => {
    withMidi(() =>
      Promise.resolve({
        outputs: new Map([
          ['a', port('E-kit')],
          ['b', port('Other')],
        ]),
      })
    );
    const out = new MidiOut();
    expect(await out.connect()).toEqual({ name: 'E-kit', error: '' });
    expect(out.name).toBe('E-kit');

    withMidi(() => Promise.resolve({ outputs: new Map([['a', port(null)]]) }));
    expect(await new MidiOut().connect()).toEqual({ name: 'MIDI out', error: '' });
  });

  it('forgets the port on disconnect', async () => {
    withMidi(() => Promise.resolve({ outputs: new Map([['a', port()]]) }));
    const out = new MidiOut();
    await out.connect();
    out.disconnect();
    expect(out.name).toBe('');
  });
});

describe('MidiOut.hit', () => {
  async function connected(p = port()) {
    withMidi(() => Promise.resolve({ outputs: new Map([['a', p]]) }));
    const out = new MidiOut();
    await out.connect();
    return out;
  }

  it('sends a note-on and a note-off on channel 10, at the audio time moved onto the performance clock', async () => {
    const p = port();
    const out = await connected(p);
    out.ctx = { currentTime: 10 } as AudioContext;
    vi.spyOn(performance, 'now').mockReturnValue(1000);

    out.hit(38, 0.5, 10.25);

    expect(p.send).toHaveBeenNthCalledWith(1, [0x99, 38, midiVelocity(0.5)], 1250);
    expect(p.send).toHaveBeenNthCalledWith(2, [0x89, 38, 0], 1290);
  });

  it('releases a note before the next strike of the same key, as a flam’s grace before its stroke', async () => {
    const p = port();
    const out = await connected(p);
    out.ctx = { currentTime: 10 } as AudioContext;
    vi.spyOn(performance, 'now').mockReturnValue(1000);

    // a grace 25 ms ahead of its stroke: off a millisecond before the stroke, not 40 ms after the grace
    out.hit(38, 0.3, 10.25, 10.275);
    expect(p.send.mock.calls[1][0]).toEqual([0x89, 38, 0]);
    expect(p.send.mock.calls[1][1]).toBeCloseTo(1274, 6);
    // a strike further off than the gate keeps the gate
    out.hit(38, 0.3, 10.5, 11);
    expect(p.send.mock.calls[3][1]).toBeCloseTo(1540, 6);
  });

  it('sends nothing with no port or no audio clock', async () => {
    const p = port();
    const out = await connected(p);
    out.hit(36, 1, 0); // no ctx yet
    out.disconnect();
    out.ctx = { currentTime: 0 } as AudioContext;
    out.hit(36, 1, 0);
    expect(p.send).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to send to
  });

  it('drops a port whose send throws, so a pulled cable does not throw on every step', async () => {
    const p = port();
    p.send.mockImplementation(() => {
      throw new Error('gone');
    });
    const out = await connected(p);
    out.ctx = { currentTime: 0 } as AudioContext;

    out.hit(36, 1, 0);

    expect(out.name).toBe('');
  });
});
