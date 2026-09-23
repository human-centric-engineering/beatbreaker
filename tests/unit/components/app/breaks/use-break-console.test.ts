// @vitest-environment happy-dom

/**
 * The console's state hook, driven directly.
 *
 * `break-console.test.tsx` mounts the whole page with no audio. This drives the
 * hook's actions one by one, with the audio engine, the sample sources and the
 * MIDI port replaced by fakes, so the paths that need a sound card — play and
 * stop, your own samples, MIDI out — are exercised too. Every assertion is on
 * what an action did to the break, the tempo or the engine, not on what a fake
 * returned.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { stashPendingLink } from '@/lib/app/breaks/pending-link';
import { encodeBreak } from '@/lib/app/breaks/share';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { testCatalogue } from '@/tests/helpers/catalogue';

const fakes = vi.hoisted(() => {
  const ctx = { currentTime: 0 };
  const state = { hasAudio: true, midiError: '', midiName: 'IAC Bus 1' };
  class FakeAudio {
    ctx: typeof ctx | null = null;
    samples: unknown = null;
    setKit = vi.fn();
    resume = vi.fn();
    hit = vi.fn();
    demo = vi.fn(() => true);
    click = vi.fn();
    kick = vi.fn();
    snare = vi.fn();
    hat = vi.fn();
    ride = vi.fn();
    crash = vi.fn();
    tom = vi.fn();
    perc = vi.fn();
    init = vi.fn(() => {
      if (!state.hasAudio) return null;
      this.ctx = ctx;
      return ctx;
    });
    close = vi.fn(() => {
      this.ctx = null;
    });
  }
  class FakePacks {
    usePercSamples = true;
    count = vi.fn(() => 5);
    percCount = vi.fn(() => 9);
  }
  class FakeUser {
    names: Record<string, string> = { k: 'kick.wav' };
    count = vi.fn(() => 1);
    add = vi.fn(async () => Promise.resolve(''));
    remove = vi.fn(async () => Promise.resolve());
  }
  class FakeMidi {
    ctx: unknown = null;
    hit = vi.fn();
    disconnect = vi.fn();
    connect = vi.fn(async () =>
      Promise.resolve({ name: state.midiError ? '' : state.midiName, error: state.midiError })
    );
  }
  const made = {
    audio: [] as FakeAudio[],
    packs: [] as FakePacks[],
    user: [] as FakeUser[],
    midi: [] as FakeMidi[],
  };
  return { ctx, state, made, FakeAudio, FakePacks, FakeUser, FakeMidi };
});

vi.mock('@/lib/app/breaks/audio/engine', () => ({
  BreakAudio: class extends fakes.FakeAudio {
    constructor() {
      super();
      fakes.made.audio.push(this);
    }
  },
  SourceStack: class {},
}));
vi.mock('@/lib/app/breaks/audio/packs', () => ({
  PackSource: class extends fakes.FakePacks {
    constructor() {
      super();
      fakes.made.packs.push(this);
    }
  },
}));
vi.mock('@/lib/app/breaks/audio/user-kit', () => ({
  UserSource: class extends fakes.FakeUser {
    constructor() {
      super();
      fakes.made.user.push(this);
    }
  },
}));
vi.mock('@/lib/app/breaks/audio/midi-out', () => ({
  MidiOut: class extends fakes.FakeMidi {
    constructor() {
      super();
      fakes.made.midi.push(this);
    }
  },
}));

import { useBreakConsole } from '@/components/app/breaks/use-break-console';

/**
 * The catalogue the hook is driven with — the seed data, built once.
 *
 * Once rather than per render: the hook memoises the resolved style, the kit
 * row and the percussion source on the catalogue itself, so a fresh object each
 * render would re-run the sample refresh forever. A client is handed one
 * catalogue for the life of the page, and this is that.
 */
const catalogue = testCatalogue();

async function mount() {
  const hook = renderHook(() => useBreakConsole(catalogue));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

function codeFor(name: string, bpm = 101) {
  const funk = catalogue.styles.funk;
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 5,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  A.name = name;
  return encodeBreak({
    bpm,
    swing: 12,
    level: 4,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/breaks');
  fakes.state.hasAudio = true;
  fakes.state.midiError = '';
  for (const list of Object.values(fakes.made)) list.length = 0;
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('arriving', () => {
  it('generates a break with a B section derived from it', async () => {
    const { result } = await mount();
    const { A, B } = result.current.patterns;
    expect(A?.style).toBe('funk');
    expect(B?.bars).toHaveLength(A?.bars.length ?? -1);
    expect(result.current.tries?.tries).toBe(16);
    expect(result.current.report?.score).toBeGreaterThanOrEqual(0);
  });

  it('opens the break in a #b= link', async () => {
    window.history.replaceState(null, '', `/breaks#b=${codeFor('Linked')}`);
    const { result } = await mount();
    expect(result.current.patterns.A?.name).toBe('Linked');
    expect(result.current.bpm).toBe(101);
    expect(result.current.level).toBe(4);
  });

  it('falls back to a fresh break when the link will not read', async () => {
    window.history.replaceState(null, '', '/breaks#b=not-a-code');
    const { result } = await mount();
    expect(result.current.patterns.A?.name).not.toBe('');
    expect(result.current.tries).not.toBeNull();
  });

  it('restores a link stashed on the way through sign-in (H5)', async () => {
    const code = codeFor('Stashed');
    stashPendingLink(localStorage, `#b=${code}`);
    const { result } = await mount();
    expect(result.current.patterns.A?.name).toBe('Stashed');
    expect(window.location.hash).toBe(`#b=${code}`);
  });

  it('prefers a link in the URL over a stashed one', async () => {
    stashPendingLink(localStorage, `#b=${codeFor('Stashed')}`);
    window.history.replaceState(null, '', `/breaks#b=${codeFor('In the URL')}`);
    const { result } = await mount();
    expect(result.current.patterns.A?.name).toBe('In the URL');
  });
});

describe('generating and editing', () => {
  it('writes a new A, a new B, or both, each undoable', async () => {
    const { result } = await mount();
    const first = result.current.patterns;

    act(() => result.current.newBreak('A'));
    expect(result.current.patterns.A).not.toBe(first.A);
    expect(result.current.patterns.B).toBe(first.B);

    act(() => result.current.newBreak('B'));
    expect(result.current.patterns.B).not.toBe(first.B);

    act(() => result.current.newBreak());
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    act(() => result.current.undo());
    act(() => result.current.undo());
    expect(result.current.patterns.A).toEqual(first.A);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.patterns.A).not.toEqual(first.A);
    // nothing further to undo or redo is a no-op, not a crash
    act(() => result.current.redo());
    act(() => result.current.redo());
    act(() => result.current.redo());
    const at = result.current.patterns;
    act(() => result.current.redo());
    expect(result.current.patterns).toBe(at);
  });

  it('rebuilds B from A', async () => {
    const { result } = await mount();
    act(() => result.current.newBreak('B'));
    act(() => result.current.buildBFromA());
    expect(result.current.patterns.B).toEqual(
      deriveB(result.current.patterns.A!, catalogue.styles.funk.params)
    );
  });

  it('applies a doctor move to the section being edited only', async () => {
    const { result } = await mount();
    const before = result.current.patterns;
    act(() => result.current.setEditing('B'));
    act(() => result.current.applyDoctor('ghosts-'));
    expect(result.current.patterns.A).toBe(before.A);
    expect(result.current.patterns.B?.bars.every((b) => !b.s.includes(1))).toBe(true);
  });

  it('cycles a cell forward and back, pinning a note to the layer it was drawn at', async () => {
    const { result } = await mount();
    act(() => result.current.setLevel(2));
    act(() => result.current.clearSection());
    expect(result.current.patterns.A?.bars[0].s.every((v) => v === 0)).toBe(true);
    expect(result.current.patterns.A?.pins).toBeNull();

    act(() => result.current.cycleCell('A', 0, 's', 3, false));
    expect(result.current.patterns.A?.bars[0].s[3]).toBe(1);
    // a ghost does not exist at L2 — the pin is what keeps it on the chart
    expect(result.current.patterns.A?.pins?.[0]?.s?.[3]).toBe(2);
    expect(result.current.view.A?.bars[0].s[3]).toBe(1);

    act(() => result.current.cycleCell('A', 0, 's', 3, true));
    expect(result.current.patterns.A?.bars[0].s[3]).toBe(0);
    act(() => result.current.cycleCell('A', 0, 'c', 0, true));
    expect(result.current.patterns.A?.bars[0].c[0]).toBe(1);
  });

  it('loads a famous break and takes its tempo, unless the tempo is locked', async () => {
    const { result } = await mount();
    /* Entries are loaded by id now, not by index into a compiled-in array. The
       helper numbers them in library order, so `entry-0` is `LIBRARY[0]` — the
       same break this has always loaded. */
    const item = LIBRARY[0];
    act(() => result.current.loadLibraryEntry('entry-0'));
    expect(result.current.patterns.A?.name).toBe(item.title);
    expect(result.current.patterns.B?.name).toBe(`${item.title} (B)`);
    expect(result.current.bpm).toBe(item.bpm);
    expect(result.current.tries).toBeNull();

    act(() => result.current.toggleLock('bpm'));
    act(() => result.current.setBpm(77));
    act(() => result.current.loadLibraryEntry('entry-1'));
    expect(result.current.bpm).toBe(77);

    const at = result.current.patterns;
    act(() => result.current.loadLibraryEntry('no-such-entry'));
    expect(result.current.patterns).toBe(at);
  });

  it('turns the toms on and off without throwing the kit lanes away', async () => {
    const { result } = await mount();
    const kick = result.current.patterns.A?.bars[0].k.slice();
    act(() => result.current.setCustomLanes({ toms: true, p1: 'cowbell' }));
    // custom lanes only apply in custom mode
    expect(result.current.patterns.A?.lanes).not.toContain('t1');
    act(() => result.current.setLanesMode('custom'));
    expect(result.current.patterns.A?.lanes).toContain('t1');
    expect(result.current.patterns.A?.bars[0].k).toEqual(kick);
    act(() => result.current.setCustomLanes({ toms: false }));
    expect(result.current.patterns.A?.lanes).not.toContain('t1');
    expect(result.current.patterns.A?.bars.every((b) => b.t1.every((v) => v === 0))).toBe(true);
    act(() => result.current.setLanesMode('style'));
    expect(result.current.lanesMode).toBe('style');
  });
});

describe('tempo, style and meter', () => {
  it('clamps the tempo to the meter’s range', async () => {
    const { result } = await mount();
    act(() => result.current.setBpm(10));
    expect(result.current.bpm).toBe(50);
    act(() => result.current.setBpm(999));
    expect(result.current.bpm).toBe(190);
    act(() => result.current.setMeter('6/8'));
    act(() => result.current.setBpm(999));
    expect(result.current.bpm).toBe(300);
    act(() => result.current.setMeter('4/4'));
    expect(result.current.bpm).toBe(190);
  });

  it('matches the tempo to the layer against the break’s own tempo, and gives it back at L5', async () => {
    const { result } = await mount();
    act(() => result.current.setLevel(5));
    act(() => result.current.setBpm(100));
    act(() => result.current.setMatchTempo(true));
    act(() => result.current.setLevel(1));
    expect(result.current.bpm).toBe(68);
    // dragging at L1 sets the L1 speed, and the break's own tempo follows
    act(() => result.current.setBpm(78));
    act(() => result.current.setLevel(5));
    expect(result.current.bpm).toBe(115);
  });

  it('switches to a style’s meter and kit, and hands yours back when you leave it', async () => {
    const { result } = await mount();
    act(() => result.current.setKit('liveroom'));
    act(() => result.current.setStyle('jazzballad'));
    expect(result.current.meter).toBe('12/8');
    expect(result.current.kit).toBe(STYLES.jazzballad.kit);
    const [lo, hi] = STYLES.jazzballad.bpm;
    expect(result.current.bpm).toBe(Math.round((lo + hi) / 2));

    act(() => result.current.setStyle('funk'));
    expect(result.current.meter).toBe('4/4');
    expect(result.current.kit).toBe('liveroom');
  });

  it('keeps a locked tempo through a change of style', async () => {
    const { result } = await mount();
    act(() => result.current.setBpm(99));
    act(() => result.current.toggleLock('bpm'));
    act(() => result.current.setStyle('metal'));
    expect(result.current.bpm).toBe(99);
    expect(result.current.locks.bpm).toBe(true);
  });

  it('keeps a fader you moved through a change of style, until you hand it back', async () => {
    const { result } = await mount();
    act(() => result.current.setLaneMix('h', 0.123));
    act(() => result.current.setStyle('bossa'));
    expect(result.current.mix.h).toBe(0.123);
    expect(result.current.mixTouched.h).toBe(true);
    act(() => result.current.resetMix());
    expect(result.current.mix.h).not.toBe(0.123);
    expect(result.current.mixTouched).toEqual({});
  });

  it('mutes and unmutes a lane', async () => {
    const { result } = await mount();
    act(() => result.current.toggleMute('s'));
    expect(result.current.mute.s).toBe(true);
    act(() => result.current.toggleMute('s'));
    expect(result.current.mute.s).toBe(false);
  });

  it('clamps the chart size', async () => {
    const { result } = await mount();
    act(() => result.current.setSize(5));
    expect(result.current.size).toBe(1.7);
    act(() => result.current.setSize(0.1));
    expect(result.current.size).toBe(0.7);
  });
});

describe('the kit', () => {
  it('refuses a kit whose engine is not ported, and one that does not exist', async () => {
    const { result } = await mount();
    act(() => result.current.setKit('tr909'));
    act(() => result.current.setKit('nope'));
    expect(result.current.kit).toBe('studio70');
  });

  it('does not fall back to a kit key the catalogue no longer has', async () => {
    /* `setKit` has always refused an unknown key. The style-change path did
       not: it asked `kitIsPlayable(catalogue.kits[wantKit])`, and
       `kitEngine(undefined)` is `'synth'` — the right answer for a ROW naming
       no engine, the wrong one for no row at all — so the check passed for a
       key that is not there. The key it reaches for is the remembered one, out
       of localStorage, so an admin deleting a kit left anyone who had it
       selected writing a dead key into state on their next style change: the
       picker showed nothing selected and playback fell through to the
       synthesised fallback with no error anywhere.

       Driven through `setStyle` rather than by calling the predicate, because
       the predicate was never the thing that was wrong — the two paths
       disagreeing was. */
    const { result } = await mount();

    // Remember `liveroom`, then move to a style that names a kit of its own —
    // so the REMEMBERED key and the selected one are now different things.
    act(() => result.current.setKit('liveroom'));
    act(() => result.current.setStyle('jazzballad'));
    expect(result.current.kit).toBe(STYLES.jazzballad.kit);

    // The remembered row goes away underneath the hook, the way a reseed or an
    // admin delete takes it away.
    const gone = catalogue.kits.liveroom;
    delete catalogue.kits.liveroom;
    try {
      // `funk` names no kit, so this is the branch that hands the remembered
      // one back — and the remembered one is now a key with no row.
      act(() => result.current.setStyle('funk'));
      expect(result.current.kit).not.toBe('liveroom');
      expect(catalogue.kits[result.current.kit]).toBeDefined();
    } finally {
      catalogue.kits.liveroom = gone;
    }
  });

  it('hands a sampled kit to the engine, initialising audio to decode into', async () => {
    const { result } = await mount();
    const audio = fakes.made.audio.at(-1)!;
    act(() => result.current.setKit('muldjord'));
    /* The engine takes the resolved row now, not a key — which is the whole
       point of the move: playback never looks a kit up for itself. */
    await waitFor(() =>
      expect(audio.setKit).toHaveBeenLastCalledWith(catalogue.kits.muldjord, expect.anything())
    );
    expect(audio.init).toHaveBeenCalled();
    expect(result.current.kitSlots).toBe(5);
    expect(result.current.percCount).toBe(9);
  });

  it('counts your own samples for the user kit', async () => {
    const { result } = await mount();
    act(() => result.current.setKit('user'));
    await waitFor(() => expect(result.current.kitSlots).toBe(1));
    expect(result.current.userNames).toEqual({ k: 'kick.wav' });
  });

  it('keeps your tuning per kit, per voice, and resets it', async () => {
    const { result } = await mount();
    act(() => result.current.setParam('k', 'pitch', 0.5));
    act(() => result.current.setParam('s', 'decay', 0.2));
    expect(result.current.kitTuned).toBe(true);
    act(() => result.current.resetVoice('k'));
    expect(result.current.kitTuned).toBe(true);
    act(() => result.current.resetKit());
    expect(result.current.kitTuned).toBe(false);
  });

  it('passes the percussion-sample preference to the packs', async () => {
    const { result } = await mount();
    act(() => result.current.setPercSamples(false));
    expect(result.current.percSamples).toBe(false);
    expect(fakes.made.packs.at(-1)?.usePercSamples).toBe(false);
  });

  it('auditions a voice and the whole kit', async () => {
    const { result } = await mount();
    act(() => result.current.audition('s', 'rim'));
    expect(fakes.made.audio.at(-1)?.hit).toHaveBeenCalledWith('s', 'rim');
    expect(result.current.auditionKit()).toBe(true);
  });

  it('adds and removes your own samples through the user source', async () => {
    const { result } = await mount();
    const file = new File([new Uint8Array(4)], 'kick.wav');
    await act(async () => {
      expect(await result.current.addSample('k', file)).toBe('');
    });
    const user = fakes.made.user.at(-1)!;
    expect(user.add).toHaveBeenCalledWith(fakes.made.audio.at(-1), 'k', file);
    await act(async () => {
      await result.current.removeSample('k');
    });
    expect(user.remove).toHaveBeenCalledWith('k');
  });
});

describe('playing', () => {
  it('starts and stops the transport', async () => {
    // the fake audio clock never advances, so the scheduler idles on one step
    const { result } = await mount();
    act(() => result.current.togglePlay());
    expect(result.current.playing).toBe(true);
    expect(fakes.made.audio.at(-1)?.resume).toHaveBeenCalled();
    act(() => result.current.setArrangement(['A', 'B']));
    act(() => result.current.togglePlay());
    expect(result.current.playing).toBe(false);
    expect(result.current.position).toBeNull();
  });

  it('stays usable without Web Audio', async () => {
    fakes.state.hasAudio = false;
    const { result } = await mount();
    act(() => result.current.togglePlay());
    expect(result.current.playing).toBe(false);
  });

  it('opens and closes a MIDI port, or says why it could not', async () => {
    const { result } = await mount();
    let answer = 'unset';
    await act(async () => {
      answer = await result.current.openMidiOut();
    });
    expect(answer).toBe('');
    expect(result.current.midiPort).toBe('IAC Bus 1');
    expect(fakes.made.midi.at(-1)?.ctx).toBe(fakes.ctx);

    act(() => result.current.closeMidiOut());
    expect(result.current.midiPort).toBe('');
    expect(fakes.made.midi.at(-1)?.disconnect).toHaveBeenCalled();

    fakes.state.midiError = 'No MIDI in this browser';
    await act(async () => {
      answer = await result.current.openMidiOut();
    });
    expect(answer).toBe('No MIDI in this browser');
  });

  it('tears the engine down on unmount', async () => {
    const { unmount } = await mount();
    const midi = fakes.made.midi.at(-1)!;
    unmount();
    expect(midi.disconnect).toHaveBeenCalled();
  });

  /* H7. A browser allows a page only a handful of AudioContexts and will not
     reopen a closed one, so leaving the Studio has to give this one back —
     stopping the transport silences it but leaves it running. */
  it('gives the AudioContext back on unmount, not just the transport', async () => {
    const { result, unmount } = await mount();
    act(() => result.current.togglePlay());
    const audio = fakes.made.audio.at(-1)!;
    expect(audio.ctx).not.toBeNull();
    unmount();
    expect(audio.close).toHaveBeenCalledTimes(1);
    expect(audio.ctx).toBeNull();
  });
});

describe('sharing and saving', () => {
  it('makes a link that loads back to the same break', async () => {
    const { result } = await mount();
    const link = result.current.shareLink();
    expect(link).toMatch(/\/breaks#b=/);
    const name = result.current.patterns.A?.name;
    act(() => result.current.newBreak());
    let ok = false;
    act(() => {
      ok = result.current.loadCode(`  ${link}  `);
    });
    expect(ok).toBe(true);
    expect(result.current.patterns.A?.name).toBe(name);
  });

  it('refuses a code that is not one', async () => {
    const { result } = await mount();
    let ok = true;
    act(() => {
      ok = result.current.loadCode('hello');
    });
    expect(ok).toBe(false);
  });

  it('exports the arrangement as MIDI, or only the soloed section', async () => {
    const { result } = await mount();
    const both = result.current.midiBase64();
    expect(atob(both).startsWith('MThd')).toBe(true);
    act(() => result.current.setViewMode('A'));
    const aOnly = result.current.midiBase64();
    expect(aOnly.length).toBeLessThan(both.length);
    act(() => result.current.setArrangement(['B']));
    expect(result.current.midiBase64()).toBe('');
  });

  it('saves, loads and deletes favourites, newest first', async () => {
    const { result } = await mount();
    const first = result.current.patterns.A?.name;
    act(() => result.current.saveFav());
    act(() => result.current.newBreak());
    act(() => result.current.saveFav());
    expect(result.current.favs).toHaveLength(2);
    expect(result.current.favs[1].name).toBe(first);

    let ok = false;
    act(() => {
      ok = result.current.loadFav(1);
    });
    expect(ok).toBe(true);
    expect(result.current.patterns.A?.name).toBe(first);
    act(() => {
      ok = result.current.loadFav(9);
    });
    expect(ok).toBe(false);

    act(() => result.current.deleteFav(0));
    expect(result.current.favs.map((f) => f.name)).toEqual([first]);
  });
});
