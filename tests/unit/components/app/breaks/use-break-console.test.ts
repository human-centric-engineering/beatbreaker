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
import { stashPendingLink, takePendingLink } from '@/lib/app/breaks/pending-link';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { clearScratch, readScratch, writeScratch } from '@/lib/app/breaks/scratch';
import { breakPayload, encodeBreak } from '@/lib/app/breaks/share';
import type { SectionLetter } from '@/lib/app/breaks/sections';
import { songOf } from '@/lib/app/breaks/songs';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { withYourKits } from '@/lib/app/breaks/samples/your-kit';
import { testCatalogue, testRudiments } from '@/tests/helpers/catalogue';
import { RUDIMENTS } from '@/prisma/seeds/app-beatbreaker/data/rudiments';

const fakes = vi.hoisted(() => {
  // `outputLatency`/`baseLatency` are optional: most tests never set them,
  // and `audioLatency()` must read that absence as 0, not as `undefined`.
  const ctx: { currentTime: number; outputLatency?: number; baseLatency?: number } = {
    currentTime: 0,
  };
  const state = { hasAudio: true, midiError: '', midiName: 'IAC Bus 1' };
  class FakeAudio {
    ctx: typeof ctx | null = null;
    samples: unknown = null;
    setKit = vi.fn();
    setPanView = vi.fn();
    // the lane channel (Phase 9): plays the voice, as the engine does
    playIn = vi.fn((_lane: string, _level: number, _t: number, play: () => void) => play());
    resume = vi.fn();
    reseed = vi.fn();
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
    // five slots of a recorded kit; a kit of yours here holds samples only (no pieces)
    count = vi.fn((kit?: { engine?: string } | null) => (kit?.engine === 'pack' ? 5 : 0));
    percCount = vi.fn(() => 9);
  }
  class FakeYours {
    count = vi.fn(() => 1);
    failedCount = vi.fn(() => 2);
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
    yours: [] as FakeYours[],
    midi: [] as FakeMidi[],
  };
  return { ctx, state, made, FakeAudio, FakePacks, FakeYours, FakeMidi };
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
vi.mock('@/lib/app/breaks/audio/your-samples', () => ({
  YourSampleSource: class extends fakes.FakeYours {
    constructor() {
      super();
      fakes.made.yours.push(this);
    }
  },
}));
/* Your settings go to your account through the API client; what they send is
   asserted on the mock, and nothing reaches a network. */
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { patch: vi.fn() } };
});
vi.mock('@/lib/app/breaks/audio/midi-out', () => ({
  MidiOut: class extends fakes.FakeMidi {
    constructor() {
      super();
      fakes.made.midi.push(this);
    }
  },
}));

import {
  type ConsoleOptions,
  type InitialPattern,
  DEFAULT_ARRANGEMENT,
  arrangementForNew,
  editingSection,
  useBreakConsole,
} from '@/components/app/breaks/use-break-console';
import { AUTOSAVE_MS } from '@/components/app/studio/use-pattern-document';
import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import { apiClient } from '@/lib/api/client';
import { DEFAULT_STUDIO_SETTINGS } from '@/lib/validations/studio-settings';

/**
 * The catalogue the hook is driven with — the seed data, built once.
 *
 * Once rather than per render: the hook memoises the resolved style, the kit
 * row and the percussion source on the catalogue itself, so a fresh object each
 * render would re-run the sample refresh forever. A client is handed one
 * catalogue for the life of the page, and this is that.
 */
/* With one kit of your own in it (D20), the way the provider hands it over. */
const catalogue = withYourKits(testCatalogue(), [
  {
    id: 'ckit00000000000000000001',
    key: 'yours-a',
    label: 'Mine',
    slots: { k: { sampleId: 'csmp00000000000000000001', name: 'kick.wav', audioUrl: '' } },
  },
]);

/* The same, with the rudiments beside the famous breaks (Phase 10). */
const withRudiments = { ...catalogue, libraries: [...catalogue.libraries, testRudiments()] };

async function mount(initial?: InitialPattern, options?: ConsoleOptions) {
  const hook = renderHook(() => useBreakConsole(catalogue, initial, options));
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
  vi.mocked(apiClient.patch).mockReset().mockResolvedValue({});
  window.history.replaceState(null, '', '/breaks');
  fakes.state.hasAudio = true;
  fakes.state.midiError = '';
  for (const list of Object.values(fakes.made)) list.length = 0;
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
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

describe('arriving on the scratch pattern you left (Phase 4)', () => {
  const kept = (name: string) => sharePayloadSchema.parse(JSON.parse(atob(codeFor(name, 77))));

  it('puts back the unsaved pattern a reload would have rolled over', async () => {
    writeScratch(localStorage, kept('Before the reload'));
    const { result } = await mount();
    expect(result.current.patterns.A?.name).toBe('Before the reload');
    expect(result.current.bpm).toBe(77);
    // nothing was generated
    expect(result.current.tries).toBeNull();
  });

  it('gives way to a link in the URL — a link is something you just asked for', async () => {
    writeScratch(localStorage, kept('Scratch'));
    window.history.replaceState(null, '', `/studio#b=${codeFor('Linked')}`);
    const { result } = await mount();
    expect(result.current.patterns.A?.name).toBe('Linked');
  });

  it('gives way to a saved pattern opened by its address', async () => {
    writeScratch(localStorage, kept('Scratch'));
    const saved: InitialPattern = {
      id: 'cbrk00000000000000000001',
      title: 'Saved',
      payload: kept('Saved'),
      mine: true,
    };
    const { result } = await mount(saved);
    expect(result.current.patterns.A?.name).toBe('Saved');
  });

  it('generates as before when what was kept will not read', async () => {
    localStorage.setItem('bb.scratch', '{"payload":{"ver":4},"at":1}');
    const { result } = await mount();
    expect(result.current.tries).not.toBeNull();
  });
});

describe('arriving on a saved pattern (/studio/[id])', () => {
  /** A saved row as the page hands it over: the stored payload, plain JSON. */
  function saved(name: string, title = name): InitialPattern {
    return {
      id: 'cbrk00000000000000000001',
      title,
      payload: sharePayloadSchema.parse(JSON.parse(atob(codeFor(name, 88)))),
      mine: true,
    };
  }

  it('mounts on the saved pattern rather than generating one', async () => {
    const { result } = await mount(saved('From the database'));
    expect(result.current.patterns.A?.name).toBe('From the database');
    expect(result.current.bpm).toBe(88);
    expect(result.current.level).toBe(4);
    // nothing was rolled: a generated arrival records its tries
    expect(result.current.tries).toBeNull();
  });

  it('takes the title from the row, which a rename changes and the document does not', async () => {
    const { result } = await mount(saved('Name in the doc', 'Renamed since'));
    expect(result.current.patterns.A?.name).toBe('Renamed since');
  });

  it('wins over a #b= link, and leaves a stashed link for the next plain visit', async () => {
    const stashed = `#b=${codeFor('Stashed')}`;
    stashPendingLink(localStorage, stashed);
    window.history.replaceState(null, '', `/studio/x#b=${codeFor('In the URL')}`);
    const { result } = await mount(saved('The saved one'));
    expect(result.current.patterns.A?.name).toBe('The saved one');
    expect(takePendingLink(localStorage)).toBe(stashed);
  });
});

describe('generating and editing', () => {
  it('writes a new A, a new B, or both, each undoable', async () => {
    const { result } = await mount();
    const first = result.current.patterns;

    act(() => {
      result.current.newBreak('A');
    });
    expect(result.current.patterns.A).not.toBe(first.A);
    expect(result.current.patterns.B).toBe(first.B);

    act(() => {
      result.current.newBreak('B');
    });
    expect(result.current.patterns.B).not.toBe(first.B);

    act(() => {
      result.current.newBreak();
    });
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

  it('regenerates the section being edited in its own style, with different notes, undoably', async () => {
    const { result } = await mount();
    const first = result.current.patterns;
    // a style picked for the next New does not change what a regenerate writes in
    act(() => result.current.setStyle('rock'));
    for (let i = 0; i < 5; i++) {
      const before = result.current.patterns.A!;
      act(() => {
        result.current.regenerate();
      });
      const after = result.current.patterns.A!;
      expect(after.style).toBe(first.A!.style);
      expect(after.meter).toBe(before.meter);
      expect(after.bars).toHaveLength(before.bars.length);
      expect(after.bars).not.toEqual(before.bars);
      expect(result.current.patterns.B).toBe(first.B);
    }
    act(() => result.current.undo());
    expect(result.current.canUndo).toBe(true);
    for (let i = 0; i < 4; i++) act(() => result.current.undo());
    expect(result.current.patterns.A).toEqual(first.A);
  });

  it('will not regenerate a section whose style has left the catalogue', async () => {
    const { result } = await mount();
    const gone = { ...result.current.patterns.A!, style: 'no-such-style' };
    act(() => {
      result.current.loadCode(
        encodeBreak({ bpm: 100, swing: 0, level: 4, arrangement: ['A'], A: gone, B: gone })
      );
    });
    const before = result.current.patterns.A;
    let ok = true;
    act(() => {
      ok = result.current.regenerate();
    });
    expect(ok).toBe(false);
    expect(result.current.patterns.A).toBe(before);
  });

  it('rebuilds B from A', async () => {
    const { result } = await mount();
    act(() => {
      result.current.newBreak('B');
    });
    act(() => {
      result.current.buildBFromA();
    });
    expect(result.current.patterns.B).toEqual(
      deriveB(result.current.patterns.A!, catalogue.styles.funk.params)
    );
  });

  it('applies a doctor move to the section being edited only', async () => {
    const { result } = await mount();
    const before = result.current.patterns;
    act(() => result.current.setViewMode('B'));
    expect(result.current.editing).toBe('B');
    act(() => {
      result.current.applyDoctor('ghosts-');
    });
    expect(result.current.patterns.A).toBe(before.A);
    expect(result.current.patterns.B?.bars.every((b) => !b.s.includes(1))).toBe(true);
  });

  /* A pattern whose style is not in the catalogue — gone, or a rudiment that
     never had one (D45) — is not doctored in whatever the picker fell back to. */
  it('leaves a section alone, and says so, when its style is not in the catalogue', async () => {
    const A = {
      ...generatePattern({
        style: catalogue.styles.funk,
        meter: '4/4',
        seed: 5,
        bars: 1,
        density: 50,
        ghosts: 50,
      }),
      style: 'rudiment',
    };
    const payload = sharePayloadSchema.parse(
      JSON.parse(atob(encodeBreak({ bpm: 90, swing: 0, level: 5, arrangement: ['A'], A, B: A })))
    );
    const { result } = await mount({ id: 'p1', title: 'Rudiment', payload, mine: true });
    const before = result.current.patterns;
    let done = true;
    act(() => {
      done = result.current.applyDoctor('ghosts-');
    });
    expect(done).toBe(false);
    act(() => {
      result.current.buildBFromA();
    });
    expect(result.current.patterns).toBe(before);
  });

  it('with Both, edits the section under the playhead while it plays', () => {
    const at = (letter: 'A' | 'B', count = false) => ({ t: 0, slot: 0, letter, count });
    expect(editingSection('both', at('B'), 'A')).toBe('B');
    expect(editingSection('both', at('A'), 'B')).toBe('A');
    /* The count-in has no bar under it: the last one touched. */
    expect(editingSection('both', at('B', true), 'A')).toBe('A');
    /* Stopped: the last one touched. */
    expect(editingSection('both', null, 'B')).toBe('B');
    /* A or B chosen: that, whatever is playing. */
    expect(editingSection('A', at('B'), 'B')).toBe('A');
    expect(editingSection('B', at('A'), 'A')).toBe('B');
  });

  /* One section choice (E11): A or B is what the grid and the Doctor work on;
     Both works on the last section chosen or edited while nothing plays. */
  it('edits the chosen section, and with Both the last one touched', async () => {
    const { result } = await mount();
    act(() => result.current.setViewMode('B'));
    act(() => result.current.setViewMode('both'));
    expect(result.current.editing).toBe('B');

    /* A cell edited in A makes A the one Both edits… */
    act(() => result.current.cycleCell('A', 0, 'k', 1, false));
    expect(result.current.editing).toBe('A');

    /* …so a Doctor move lands on A and leaves B alone. */
    const before = result.current.patterns;
    act(() => {
      result.current.applyDoctor('ghosts-');
    });
    expect(result.current.patterns.B).toBe(before.B);
    expect(result.current.patterns.A).not.toBe(before.A);

    act(() => result.current.setViewMode('A'));
    expect(result.current.editing).toBe('A');
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
    // stepping back from empty lands on the lane's last value: the crash lane's splash (9-iv)
    act(() => result.current.cycleCell('A', 0, 'c', 0, true));
    expect(result.current.patterns.A?.bars[0].c[0]).toBe(4);
  });

  it('sets cells by value, a drag being one undo step (5.15)', async () => {
    const { result } = await mount();
    act(() => result.current.clearSection());
    const before = result.current.patterns.A;

    act(() => {
      result.current.setCell('A', 0, 's', 0, 2, 'start');
      result.current.setCell('A', 0, 's', 1, 2, 'continue');
      result.current.setCell('A', 0, 's', 2, 2, 'continue');
      result.current.setCell('A', 0, 's', 3, 2, 'continue');
    });
    expect(result.current.patterns.A?.bars[0].s.slice(0, 4)).toEqual([2, 2, 2, 2]);

    act(() => result.current.undo());
    expect(result.current.patterns.A).toEqual(before);
  });

  it('adds no undo step for clearing a cell that is already empty (5.15)', async () => {
    const { result } = await mount();
    act(() => result.current.clearSection());
    const before = result.current.patterns;
    act(() => result.current.setCell('A', 0, 'k', 0, 0));
    expect(result.current.patterns).toEqual(before);
    act(() => result.current.undo());
    // the undo took the clear back, not a dead step
    expect(result.current.patterns.A?.bars[0].k.some(Boolean)).toBe(true);
  });

  it('pins a note set at a lower layer, as cycling does (5.15)', async () => {
    const { result } = await mount();
    act(() => result.current.setLevel(2));
    act(() => result.current.clearSection());
    act(() => result.current.setCell('A', 0, 's', 3, 4));
    expect(result.current.patterns.A?.bars[0].s[3]).toBe(4);
    expect(result.current.patterns.A?.pins?.[0]?.s?.[3]).toBe(2);
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

  it('opens a rudiment with its sticking, B a copy of A, and no style to write it in', async () => {
    const hook = renderHook(() => useBreakConsole(withRudiments));
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    const { result } = hook;
    const paradiddle = RUDIMENTS.findIndex((r) => r.title === 'Single Paradiddle');
    act(() => result.current.loadLibraryEntry(`rudiment-${paradiddle}`));
    const { A, B } = result.current.patterns;
    expect(A?.name).toBe('Single Paradiddle');
    expect(A?.lanes).toEqual(['s']);
    expect(A?.sticking).toEqual(['RLRRLRLLRLRRLRLL']);
    expect(B?.bars).toEqual(A?.bars);
    expect(B?.sticking).toEqual(A?.sticking);
    expect(result.current.regenerate()).toBe(false);

    // nor is a new A or B written over it in some other style, nor B built from it
    const before = result.current.patterns;
    let wrote = true;
    act(() => {
      wrote = result.current.newBreak('A') || result.current.buildBFromA();
    });
    expect(wrote).toBe(false);
    expect(result.current.patterns).toBe(before);
  });

  it('opens a double-stroke roll open in A and closed in B, played A then B (13-a)', async () => {
    const hook = renderHook(() => useBreakConsole(withRudiments));
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    const { result } = hook;
    const five = RUDIMENTS.findIndex((r) => r.title === 'Five Stroke Roll');
    act(() => result.current.loadLibraryEntry(`rudiment-${five}`));
    const { A, B } = result.current.patterns;
    expect(A?.tuplets).toBeUndefined();
    // each roll's two doubles are one span, in the beat they share
    expect(B?.tuplets?.map((t) => [t.start, t.n])).toEqual([
      [2, 4],
      [10, 4],
    ]);
    expect(B?.sticking).toEqual(['..RLR.....LRL...']);
    expect(B?.tempoRatio).toBeUndefined();
    expect(result.current.arrangement).toEqual(['A', 'B']);
  });

  it('keeps a double’s hand when another note in its bar is edited (13-a)', async () => {
    const hook = renderHook(() => useBreakConsole(withRudiments));
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    const { result } = hook;
    const five = RUDIMENTS.findIndex((r) => r.title === 'Five Stroke Roll');
    act(() => result.current.loadLibraryEntry(`rudiment-${five}`));
    act(() => result.current.setCell('B', 0, 'k', 0, 1));
    // the hands for the accents go with the edit; the doubles keep theirs, so they stay doubles
    expect(result.current.patterns.B?.sticking).toEqual(['..RL......LR....']);
  });

  it('writes the lead hand on a step doubled with none written (13-a)', async () => {
    const { result } = await mount();
    const step = result.current.patterns.A?.bars[0].s.findIndex((v) => v > 0) ?? 0;
    act(() => {
      result.current.editTuplet('A', 0, 's', step, { kind: 'double' });
    });
    expect(result.current.patterns.A?.sticking?.[0]?.[step]).toBe('R');
  });

  it('doubles a note keeping the hand written on it, and undoes it to the note (13-a)', async () => {
    const hook = renderHook(() => useBreakConsole(withRudiments));
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    const { result } = hook;
    const paradiddle = RUDIMENTS.findIndex((r) => r.title === 'Single Paradiddle');
    act(() => result.current.loadLibraryEntry(`rudiment-${paradiddle}`));
    const before = result.current.patterns.A;
    act(() => {
      result.current.editTuplet('A', 0, 's', 2, { kind: 'double' });
    });
    const A = result.current.patterns.A;
    expect(A?.tuplets).toEqual([{ bar: 0, start: 2, span: 1, n: 2, notes: { s: [2, 2] } }]);
    expect(A?.sticking).toEqual(before?.sticking);

    act(() => {
      result.current.editTuplet('A', 0, 's', 2, { kind: 'unmake' });
    });
    expect(result.current.patterns.A?.tuplets).toBeUndefined();
    expect(result.current.patterns.A?.bars).toEqual(before?.bars);
    expect(result.current.patterns.A?.sticking).toEqual(before?.sticking);
  });

  it('takes the hands off an edited rudiment bar, and the fixed flag off a cleared one', async () => {
    const hook = renderHook(() => useBreakConsole(withRudiments));
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    const { result } = hook;
    const paradiddle = RUDIMENTS.findIndex((r) => r.title === 'Single Paradiddle');
    act(() => result.current.loadLibraryEntry(`rudiment-${paradiddle}`));
    expect(result.current.patterns.A?.fixed).toBe(true);

    // the hands were written for the notes that were there, not these
    act(() => result.current.setCell('A', 0, 's', 1, 0));
    expect(result.current.patterns.A?.sticking).toBeUndefined();
    expect(result.current.patterns.A?.fixed).toBe(true);

    // what is drawn over a cleared rudiment is not the rudiment: its layers derive
    act(() => result.current.clearSection());
    expect(result.current.patterns.A?.fixed).toBeUndefined();

    act(() => result.current.cycleCell('B', 0, 's', 1, false));
    expect(result.current.patterns.B?.sticking).toBeUndefined();
    expect(result.current.patterns.B?.fixed).toBe(true);
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

    // a style with no kit of its own
    act(() => result.current.setStyle('reggae'));
    expect(STYLES.reggae.kit).toBeUndefined();
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

describe('sections in different meters (11-e-ii-a)', () => {
  function mixedCode(aMeter: string, bpm: number, bMeter = '4/4') {
    const funk = catalogue.styles.funk;
    const at = (meter: string, seed: number, bars: number) =>
      generatePattern({ style: funk, meter, seed, bars, density: 50, ghosts: 50 });
    return encodeBreak({
      bpm,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A: at(aMeter, 5, 2),
      B: at(bMeter, 6, 1),
    });
  }

  it('shows the meter of the section on the stage, and follows you to the other', async () => {
    const { result } = await mount();
    act(() => result.current.setViewMode('A'));
    act(() => {
      result.current.loadCode(mixedCode('7/8', 120));
    });
    expect(result.current.meter).toBe('7/8');
    act(() => result.current.setViewMode('B'));
    expect(result.current.meter).toBe('4/4');
    act(() => result.current.setViewMode('A'));
    expect(result.current.meter).toBe('7/8');
  });

  it('opens on the meter of the section being edited, not always A’s', async () => {
    const { result } = await mount();
    act(() => result.current.setViewMode('B'));
    act(() => {
      result.current.loadCode(mixedCode('7/8', 120));
    });
    expect(result.current.meter).toBe('4/4');
  });

  it('writes a new B in the meter picked for it, leaving A in its own', async () => {
    const { result } = await mount();
    const a = result.current.patterns.A;
    act(() => result.current.setViewMode('B'));
    act(() => result.current.setMeter('7/8'));
    act(() => {
      result.current.newBreak('B');
    });
    expect(result.current.patterns.A).toBe(a);
    expect(result.current.patterns.B?.meter).toBe('7/8');
    expect(result.current.meter).toBe('7/8');
    act(() => result.current.setViewMode('A'));
    expect(result.current.meter).toBe(a?.meter);
  });

  it('keeps a meter picked for the next New when you move to the other section', async () => {
    const { result } = await mount();
    act(() => result.current.setViewMode('A'));
    act(() => {
      result.current.loadCode(mixedCode('7/8', 120));
    });
    act(() => result.current.setMeter('5/4'));
    act(() => result.current.setViewMode('B'));
    expect(result.current.meter).toBe('5/4');
  });

  it('shows the length and style of the section on the stage, not always A’s', async () => {
    const { result } = await mount();
    act(() => result.current.setViewMode('B'));
    act(() => {
      result.current.loadCode(mixedCode('7/8', 120));
    });
    expect(result.current.bars).toBe(1);
    act(() => result.current.setViewMode('A'));
    expect(result.current.bars).toBe(2);
    expect(result.current.style).toBe('funk');
  });

  it('gives a locked tempo back when the meters match again', async () => {
    const { result } = await mount();
    act(() => result.current.setViewMode('B'));
    act(() => {
      result.current.loadCode(mixedCode('4/4-8', 300, '4/4-8'));
    });
    act(() => result.current.toggleLock('bpm'));
    expect(result.current.bpm).toBe(300);
    // a New B in 4/4 holds the break to 190 ...
    act(() => result.current.setMeter('4/4'));
    act(() => {
      result.current.newBreak('B');
    });
    expect(result.current.bpm).toBe(190);
    // ... and taking it back brings the 300 back
    act(() => result.current.undo());
    expect(result.current.patterns.B?.meter).toBe('4/4-8');
    expect(result.current.bpm).toBe(300);
  });

  it('keeps a tempo you set yourself while the break was held down', async () => {
    const { result } = await mount();
    act(() => result.current.setViewMode('B'));
    act(() => {
      result.current.loadCode(mixedCode('4/4-8', 300, '4/4-8'));
    });
    act(() => result.current.setMeter('4/4'));
    act(() => {
      result.current.newBreak('B');
    });
    act(() => result.current.setBpm(150));
    act(() => result.current.undo());
    expect(result.current.bpm).toBe(150);
  });

  it('holds the tempo to the lowest of the sections’ ceilings', async () => {
    const { result } = await mount();
    // A in eighths goes to 380 on its own; a B in 4/4 holds the break to 190
    act(() => {
      result.current.loadCode(mixedCode('4/4-8', 300));
    });
    expect(result.current.bpmCeiling).toBe(190);
    expect(result.current.bpm).toBe(190);
    act(() => result.current.setViewMode('A'));
    act(() => result.current.setBpm(999));
    expect(result.current.bpm).toBe(190);
  });
});

describe('the kit', () => {
  it('takes a drum machine now they are built (9-vi-e), and refuses a kit that does not exist', async () => {
    const { result } = await mount();
    act(() => result.current.setKit('tr909'));
    expect(result.current.kit).toBe('tr909');
    act(() => result.current.setKit('nope'));
    expect(result.current.kit).toBe('tr909');
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

  it('pans the engine from the stool at start, and out front once that is chosen (Phase 9)', async () => {
    const { result } = await mount();
    const audio = fakes.made.audio.at(-1)!;
    expect(result.current.panView).toBe('drummer');
    expect(audio.setPanView).toHaveBeenCalledWith('drummer');

    act(() => result.current.setPanView('audience'));
    expect(result.current.panView).toBe('audience');
    expect(audio.setPanView).toHaveBeenLastCalledWith('audience');
  });

  describe('Humanise (Phase 9)', () => {
    /** Two seconds of the transport: when each kick, snare and hat was played. */
    const hear = (result: Awaited<ReturnType<typeof mount>>['result']): number[] => {
      const audio = fakes.made.audio.at(-1)!;
      for (const f of [audio.kick, audio.snare, audio.hat]) f.mockClear();
      fakes.ctx.currentTime = 0;
      vi.useFakeTimers();
      try {
        act(() => {
          result.current.play();
        });
        for (let i = 0; i < 80; i++) {
          fakes.ctx.currentTime += 0.025;
          act(() => {
            vi.advanceTimersByTime(25);
          });
        }
        act(() => result.current.stopPlaying());
      } finally {
        vi.useRealTimers();
        fakes.ctx.currentTime = 0;
      }
      return [audio.kick, audio.snare, audio.hat].flatMap((f) =>
        f.mock.calls.map((c: unknown[]) => c[0] as number)
      );
    };

    it('starts at Subtle, 35', async () => {
      const { result } = await mount();
      expect(result.current.humanise).toEqual({ mode: 'subtle', amount: 35, take: 0 });
    });

    it('sets the Amount from the switch, and keeps it while Off', async () => {
      const { result } = await mount();
      act(() => result.current.setHumaniseMode('loose'));
      expect(result.current.humanise.amount).toBe(75);
      act(() => result.current.setHumaniseAmount(60));
      act(() => result.current.setHumaniseMode('off'));
      expect(result.current.humanise).toMatchObject({ mode: 'off', amount: 60 });
    });

    it('plays a new take as another performance, and Off as none at all', async () => {
      const { result } = await mount();
      act(() => result.current.setCountIn(0));
      const audio = fakes.made.audio.at(-1)!;
      const first = hear(result);
      expect(first.length).toBeGreaterThan(8);
      const seed = audio.reseed.mock.calls.at(-1)?.[0];
      expect(hear(result)).toEqual(first); // the same performance from Play

      act(() => result.current.newTake());
      expect(result.current.humanise.take).toBe(1);
      const second = hear(result);
      expect(audio.reseed.mock.calls.at(-1)?.[0]).not.toBe(seed);
      expect(second).not.toEqual(first);

      // Off sends Amount 0: every take is the same notes, where the feel puts them
      act(() => result.current.setHumaniseMode('off'));
      const off = hear(result);
      act(() => result.current.newTake());
      expect(hear(result)).toEqual(off);
      expect(off).not.toEqual(second);
    });

    it('writes the file Played or Quantised, and Off makes them the same', async () => {
      const { result } = await mount();
      expect(result.current.midi(true)!.bytes).not.toEqual(result.current.midi(false)!.bytes);
      act(() => result.current.setHumaniseMode('off'));
      expect(result.current.midi(true)!.bytes).toEqual(result.current.midi(false)!.bytes);
    });
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
    // only your own kits have samples that can fail to load
    expect(result.current.kitFailed).toBe(0);
    expect(result.current.percCount).toBe(9);
  });

  it('counts the decoded samples of a kit of yours, asking the source about that kit', async () => {
    const { result } = await mount();
    act(() => result.current.setKit('yours-a'));
    await waitFor(() => expect(result.current.kitSlots).toBe(1));
    expect(fakes.made.yours.at(-1)?.count).toHaveBeenLastCalledWith(catalogue.kits['yours-a']);
    expect(result.current.kitFailed).toBe(2);
    expect(fakes.made.yours.at(-1)?.failedCount).toHaveBeenLastCalledWith(
      catalogue.kits['yours-a']
    );
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

  it('goes back to the top and counts in again when the next break replaces a playing one', async () => {
    const { result } = await mount();
    // no count-in of your own: the restart counts in a bar anyway
    act(() => result.current.setCountIn(0));
    act(() => result.current.togglePlay());
    const audio = fakes.made.audio.at(-1)!;
    expect(audio.resume).toHaveBeenCalledTimes(1);
    const clicks = audio.click.mock.calls.length;

    act(() => result.current.restartFromTop());
    act(() => {
      result.current.newBreak();
    });
    expect(result.current.playing).toBe(true);
    expect(audio.resume).toHaveBeenCalledTimes(2);
    expect(audio.click.mock.calls.length).toBeGreaterThan(clicks);
  });

  it('leaves a stopped break stopped, and asks nothing of a later one', async () => {
    const { result } = await mount();
    act(() => result.current.restartFromTop());
    act(() => {
      result.current.newBreak();
    });
    expect(result.current.playing).toBe(false);
    act(() => result.current.togglePlay());
    act(() => {
      result.current.newBreak();
    });
    expect(fakes.made.audio.at(-1)!.resume).toHaveBeenCalledTimes(1);
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
    act(() => {
      result.current.newBreak();
    });
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
    const both = result.current.midi()!.bytes;
    // 'MThd', the Standard MIDI File header
    expect(both.slice(0, 4)).toEqual([0x4d, 0x54, 0x68, 0x64]);
    act(() => result.current.setViewMode('A'));
    const aOnly = result.current.midi()!.bytes;
    expect(aOnly.length).toBeLessThan(both.length);
    act(() => result.current.setArrangement(['B']));
    expect(result.current.midi()).toBeNull();
  });
});

describe('your settings (D19, D21)', () => {
  /** What reached `PATCH /api/v1/studio-settings`, one body per request. */
  const patches = () =>
    vi
      .mocked(apiClient.patch)
      .mock.calls.filter(([url]) => url === '/api/v1/studio-settings')
      .map(([, opts]) => opts?.body);

  /** Let the debounce run out. Fake timers go on after mounting, so `waitFor` still polls. */
  async function settle() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
    });
  }

  function savedAt(bpm: number): InitialPattern {
    return {
      id: 'cbrk00000000000000000001',
      title: 'Saved',
      payload: sharePayloadSchema.parse(JSON.parse(atob(codeFor('Saved', bpm)))),
      mine: true,
    };
  }

  it('starts from the settings the page read, not the defaults', async () => {
    const { result } = await mount(undefined, {
      settings: { ...DEFAULT_STUDIO_SETTINGS, kit: 'liveroom', countIn: 2, startStyle: 'bossa' },
    });
    expect(result.current.kit).toBe('liveroom');
    expect(result.current.countIn).toBe(2);
    // a pattern you arrive to is written in your starting style
    expect(result.current.patterns.A?.style).toBe('bossa');
  });

  it('opens a fresh console at your starting layer (7B, D27) — set from your ability', async () => {
    const { result } = await mount(undefined, {
      settings: { ...DEFAULT_STUDIO_SETTINGS, startLevel: 1 },
    });
    expect(result.current.level).toBe(1);
  });

  it('falls back to the default starting layer when no settings were read', async () => {
    const { result } = await mount();
    expect(result.current.level).toBe(DEFAULT_STUDIO_SETTINGS.startLevel);
  });

  it('sends a burst of changes as one PATCH, after the last', async () => {
    const { result } = await mount();
    vi.useFakeTimers();
    act(() => result.current.setDensity(10));
    act(() => result.current.setDensity(20));
    act(() => result.current.setCountIn(2));
    act(() => result.current.setParam('k', 'pitch', 0.5));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS - 1);
    });
    expect(patches()).toEqual([]);
    await settle();
    // the tuning is kept against the kit by name, merged into what it had
    expect(patches()).toEqual([
      { density: 20, countIn: 2, sound: { studio70: { k: { pitch: 0.5 } } } },
    ]);
  });

  it('sends nothing for opening a pattern — only a choice is a setting', async () => {
    const { result } = await mount();
    vi.useFakeTimers();
    act(() => result.current.loadLibraryEntry('entry-0'));
    act(() => {
      result.current.loadCode(codeFor('Pasted', 140));
    });
    await settle();
    expect(patches()).toEqual([]);
  });

  it('on a new pattern, changing the style moves your starting style, meter and tempo', async () => {
    const { result } = await mount();
    vi.useFakeTimers();
    act(() => result.current.setStyle('jazzballad'));
    await settle();
    const [lo, hi] = STYLES.jazzballad.bpm;
    expect(patches()).toEqual([
      expect.objectContaining({
        startStyle: 'jazzballad',
        startMeter: '12/8',
        startBpm: Math.round((lo + hi) / 2),
        // the style brings its own kit, which is the kit you are now playing
        kit: STYLES.jazzballad.kit,
      }),
    ]);
  });

  it('on a new pattern, changing the length and meter moves them too', async () => {
    const { result } = await mount();
    vi.useFakeTimers();
    act(() => result.current.setBars(4));
    act(() => result.current.setMeter('7/8'));
    await settle();
    expect(patches()).toEqual([{ startBars: 4, startMeter: '7/8', userMeter: '7/8' }]);
  });

  it('changing the tempo of a saved pattern sends nothing and leaves the starting tempo alone', async () => {
    const { result } = await mount(savedAt(88), { stageSaved: () => true });
    vi.useFakeTimers();
    act(() => result.current.setBpm(120));
    expect(result.current.bpm).toBe(120);
    await settle();
    expect(patches()).toEqual([]);
    // New pattern opens at the starting tempo, not the saved pattern's
    act(() => {
      result.current.newBreak();
    });
    expect(result.current.bpm).toBe(DEFAULT_STUDIO_SETTINGS.startBpm);
  });

  it('gives your arrangement back after a song in sections, and keeps the song’s order only if you changed it', async () => {
    const { result } = await mount(undefined, {
      settings: { ...DEFAULT_STUDIO_SETTINGS, startStyle: 'lombardo' },
    });
    const inSections = () => !!result.current.patterns.A?.song?.includes(':');
    const newUntil = (want: boolean) => {
      for (let i = 0; i < 200 && inSections() !== want; i++)
        act(() => void result.current.newBreak());
      expect(inSections()).toBe(want);
    };
    newUntil(false);
    const yours: SectionLetter[] = ['A', 'B', 'A', 'B', 'B'];
    act(() => result.current.setArrangement(yours));

    // the song's order while it plays, and yours again after it
    newUntil(true);
    expect(result.current.arrangement).not.toEqual(yours);
    newUntil(false);
    expect(result.current.arrangement).toEqual(yours);

    // an order you changed while the song played is yours, and stays
    newUntil(true);
    const changed: SectionLetter[] = ['B', 'A'];
    act(() => result.current.setArrangement(changed));
    newUntil(false);
    expect(result.current.arrangement).toEqual(changed);
  });

  it('New of a song written in sections writes every section and its arrangement, and one Undo takes them back', async () => {
    const { result } = await mount(undefined, {
      settings: { ...DEFAULT_STUDIO_SETTINGS, startStyle: 'lombardo' },
    });
    const inSections = () => !!result.current.patterns.A?.song?.includes(':');
    // New until it plays one of his songs in one part, then until one in sections
    for (let i = 0; i < 200 && inSections(); i++) act(() => void result.current.newBreak());
    let before = { patterns: result.current.patterns, arrangement: result.current.arrangement };
    for (let i = 0; i < 200 && !inSections(); i++) {
      before = { patterns: result.current.patterns, arrangement: result.current.arrangement };
      act(() => void result.current.newBreak());
    }
    expect(before.patterns.A?.song).toBeDefined();
    expect(before.patterns.A?.song).not.toContain(':');

    const song = songOf(STYLES.lombardo, result.current.patterns.A?.song);
    expect(song?.sections).toBeDefined();
    const sections = song?.sections ?? [];
    expect(
      Object.keys(result.current.patterns).filter((L) => result.current.patterns[L as 'A'] != null)
    ).toEqual(sections.map((x) => x.letter));
    expect(result.current.patterns.B?.song).toBe(`${song?.key}:B`);
    expect(result.current.arrangement).toEqual(song?.arrangement);
    // the pickers show the section on the stage: A, in its meter
    expect(result.current.meter).toBe(result.current.patterns.A?.meter);

    // one Undo: the song in one part before it, and its arrangement
    act(() => result.current.undo());
    expect(result.current.patterns.A).toEqual(before.patterns.A);
    expect(result.current.patterns.B).toEqual(before.patterns.B);
    expect(result.current.arrangement).toEqual(before.arrangement);
  });

  it('after opening a saved pattern at another tempo, New pattern opens at your starting values', async () => {
    const { result } = await mount(undefined, {
      settings: { ...DEFAULT_STUDIO_SETTINGS, startStyle: 'bossa', startBpm: 132, startBars: 1 },
    });
    act(() => {
      result.current.loadPayload(savedAt(88).payload, 'Saved');
    });
    expect(result.current.bpm).toBe(88);
    expect(result.current.style).toBe('funk');

    act(() => {
      result.current.newBreak();
    });
    expect(result.current.bpm).toBe(132);
    expect(result.current.style).toBe('bossa');
    expect(result.current.patterns.A?.style).toBe('bossa');
    expect(result.current.patterns.A?.bars).toHaveLength(1);
  });

  it('a style picked while looking at a saved pattern is what New writes in, without moving the starting style', async () => {
    const { result } = await mount(savedAt(88), { stageSaved: () => true });
    vi.useFakeTimers();
    act(() => result.current.setStyle('bossa'));
    act(() => {
      result.current.newBreak();
    });
    expect(result.current.patterns.A?.style).toBe('bossa');
    await settle();
    expect(patches().some((b) => b && typeof b === 'object' && 'startStyle' in b)).toBe(false);
  });

  it('New uses up a style picked on a saved pattern, and the next New is your starting style again', async () => {
    const { result } = await mount(savedAt(88), { stageSaved: () => true });
    act(() => result.current.setStyle('bossa'));
    act(() => {
      result.current.newBreak();
    });
    expect(result.current.patterns.A?.style).toBe('bossa');
    act(() => {
      result.current.newBreak();
    });
    expect(result.current.patterns.A?.style).toBe(DEFAULT_STUDIO_SETTINGS.startStyle);
  });

  it('picking again on a new pattern drops the pick made on a saved one', async () => {
    let saved = true;
    const { result } = await mount(savedAt(88), { stageSaved: () => saved });
    act(() => result.current.setStyle('bossa'));
    act(() => result.current.setBars(4));
    // the stage becomes a new pattern without New (a pasted code, say)
    saved = false;
    act(() => result.current.setStyle('jazzballad'));
    act(() => {
      result.current.newBreak();
    });
    // the style you picked on the new pattern, not the one from before it
    expect(result.current.patterns.A?.style).toBe('jazzballad');
    // the length picked on the saved pattern was not picked again, so it still counts
    expect(result.current.patterns.A?.bars).toHaveLength(4);
  });

  it('sends tuning a kit at a time, and a reset as that kit with nothing in it', async () => {
    const { result } = await mount(undefined, {
      settings: { ...DEFAULT_STUDIO_SETTINGS, sound: { liveroom: { k: { rate: 1.1 } } } },
    });
    vi.useFakeTimers();
    act(() => result.current.setParam('k', 'pitch', 0.5));
    await settle();
    act(() => result.current.resetKit());
    await settle();
    // never the other kit's tuning, which another device may have changed since
    expect(patches()).toEqual([
      { sound: { studio70: { k: { pitch: 0.5 } } } },
      { sound: { studio70: {} } },
    ]);
    expect(result.current.kitTuned).toBe(false);
  });

  it('a new section is written with the pattern on the stage, not the starting values', async () => {
    const { result } = await mount(undefined, {
      settings: { ...DEFAULT_STUDIO_SETTINGS, startStyle: 'bossa' },
    });
    act(() => {
      result.current.loadCode(codeFor('Pasted'));
    });
    act(() => {
      result.current.newBreak('B');
    });
    expect(result.current.patterns.B?.style).toBe('funk');
    expect(result.current.bpm).toBe(101);
  });

  it('keeps the layer tempo match through a reload of an unsaved pattern', async () => {
    const options = { settings: { ...DEFAULT_STUDIO_SETTINGS, matchTempo: true } };
    const first = await mount(undefined, options);
    act(() => first.result.current.setLevel(5));
    act(() => first.result.current.setBpm(100));
    act(() => first.result.current.setLevel(1));
    expect(first.result.current.bpm).toBe(68);
    // what the document keeps for a pattern that was never saved
    clearScratch(localStorage);
    writeScratch(localStorage, first.result.current.payload()!);
    first.unmount();

    const { result } = await mount(undefined, options);
    expect(readScratch(localStorage)).not.toBeNull();
    expect(result.current.level).toBe(1);
    expect(result.current.bpm).toBe(68);
    // the break's own tempo came back with it: L5 is where it was written
    act(() => result.current.setLevel(5));
    expect(result.current.bpm).toBe(100);
  });

  it('keeps nothing of the pattern or your settings in the browser', async () => {
    const { result } = await mount();
    act(() => result.current.setBpm(120));
    act(() => result.current.setStyle('bossa'));
    act(() => result.current.setDensity(12));
    act(() => result.current.setKit('liveroom'));
    act(() => result.current.setLevel(2));
    const keys = Object.keys(localStorage);
    expect(keys.filter((k) => k !== 'bb.scratch' && k !== 'bb.view' && k !== 'bb.size')).toEqual(
      []
    );
  });
});

describe("applying BeatBuddy's changes (7.13)", () => {
  /** A BeatBuddy document: the code's break, as the wire payload a tool returns. */
  function buddyPayload(name: string, bpm: number) {
    const code = codeFor(name, bpm);
    return sharePayloadSchema.parse(JSON.parse(atob(code)));
  }

  it('puts the document on the stage, tempo and all, and one Undo restores notes and tempo', async () => {
    const { result } = await mount();
    const before = {
      A: result.current.patterns.A,
      bpm: result.current.bpm,
      swing: result.current.swing,
      level: result.current.level,
    };

    act(() => {
      result.current.applyAssistant(buddyPayload('Buddy', 132), true);
    });
    expect(result.current.patterns.A?.name).toBe('Buddy');
    expect(result.current.bpm).toBe(132);
    expect(result.current.swing).toBe(12);
    expect(result.current.level).toBe(4);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.patterns.A).toEqual(before.A);
    expect(result.current.bpm).toBe(before.bpm);
    expect(result.current.swing).toBe(before.swing);
    expect(result.current.level).toBe(before.level);

    // and Redo brings BeatBuddy's version back, tempo included
    act(() => result.current.redo());
    expect(result.current.patterns.A?.name).toBe('Buddy');
    expect(result.current.bpm).toBe(132);
  });

  it('adds no undo step for a later change in the same turn, so one Undo takes the turn back', async () => {
    const { result } = await mount();
    const before = result.current.patterns.A;

    act(() => {
      result.current.applyAssistant(buddyPayload('First', 110), true);
    });
    act(() => {
      result.current.applyAssistant(buddyPayload('Second', 120), false);
    });
    expect(result.current.patterns.A?.name).toBe('Second');

    act(() => result.current.undo());
    expect(result.current.patterns.A).toEqual(before);
    expect(result.current.canUndo).toBe(false);
  });

  it('lights the cells that changed, then lets them go', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = await mount();
    const before = result.current.patterns.A;

    act(() => {
      result.current.applyAssistant(buddyPayload('Lit', 100), true);
    });
    const after = result.current.patterns.A;
    const lit = result.current.flash?.cells.A ?? new Set<string>();
    expect(lit.size).toBeGreaterThan(0);
    for (const key of lit) {
      const [b, lane, i] = key.split(':');
      const was = before?.bars[Number(b)]?.[lane as 'k']?.[Number(i)] ?? 0;
      expect(after?.bars[Number(b)][lane as 'k'][Number(i)]).not.toBe(was);
    }

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.flash).toBeNull();
  });
});

describe('what a practice session drives (7D)', () => {
  it('holds match tempo off while a session runs, and gives it back as it was', async () => {
    const options = { settings: { ...DEFAULT_STUDIO_SETTINGS, matchTempo: true } };
    const { result } = await mount(undefined, options);
    act(() => result.current.setLevel(5));
    act(() => result.current.setBpm(100));

    act(() => result.current.setSessionHold(true));
    act(() => result.current.setLevel(1));
    // the item's tempo is the tempo you hear: no layer scaling
    expect(result.current.bpm).toBe(100);
    act(() => result.current.playAt(84));
    expect(result.current.bpm).toBe(84);
    // the setting itself was never touched
    expect(result.current.matchTempo).toBe(true);

    act(() => result.current.setSessionHold(false));
    // back on: L1 of a 100 bpm break, as before the session
    expect(result.current.bpm).toBe(68);
  });

  it('plays at a session tempo without moving the pattern’s own', async () => {
    const { result } = await mount();
    act(() => result.current.setLevel(5));
    act(() => result.current.setBpm(100));
    act(() => result.current.playAt(30));
    expect(result.current.bpm).toBe(40); // the slowest a session plays
    act(() => result.current.quickTempo(100));
    expect(result.current.bpm).toBe(100); // 100% finds the pattern's own tempo again
  });

  it('holds the ramp off while a session runs, and reports boundaries on the audio clock', async () => {
    const { result } = await mount();
    act(() => result.current.setBpm(120));
    act(() => result.current.setRamp(5));
    act(() => result.current.setCountIn(0));
    const loops: number[] = [];
    const downbeats: number[] = [];
    act(() =>
      result.current.setClockListener({
        onLoop: (at) => loops.push(at),
        onDownbeat: (at) => downbeats.push(at),
      })
    );
    act(() => result.current.setSessionHold(true));

    vi.useFakeTimers();
    try {
      act(() => {
        expect(result.current.play()).toBe(true);
      });
      // run the scheduler over a minute of audio clock
      for (let i = 0; i < 2400; i++) {
        fakes.ctx.currentTime += 0.025;
        act(() => {
          vi.advanceTimersByTime(25);
        });
      }
      expect(downbeats).toHaveLength(1);
      expect(loops.length).toBeGreaterThan(1);
      // boundaries are increasing audio-clock times
      expect(loops).toEqual([...loops].sort((a, b) => a - b));
      expect(result.current.bpm).toBe(120); // held: no ramp
      expect(result.current.ramp).toBe(5); // and the trainer setting kept

      act(() => result.current.setSessionHold(false));
      for (let i = 0; i < 2400; i++) {
        fakes.ctx.currentTime += 0.025;
        act(() => {
          vi.advanceTimersByTime(25);
        });
      }
      expect(result.current.bpm).toBeGreaterThan(120); // the ramp is back
      act(() => result.current.stopPlaying());
      expect(result.current.playing).toBe(false);
    } finally {
      vi.useRealTimers();
      fakes.ctx.currentTime = 0;
    }
  });
});

describe('the 3D drummer feed (subscribeSteps, audioLatency)', () => {
  /** Runs the scheduler for `ms` of (fake) audio-clock and wall-clock time. */
  const runScheduler = (ms: number) => {
    const ticks = Math.round(ms / 25);
    for (let i = 0; i < ticks; i++) {
      fakes.ctx.currentTime += 0.025;
      act(() => {
        vi.advanceTimersByTime(25);
      });
    }
  };

  it('fans every scheduled step out to each subscribed listener, with identical steps', async () => {
    const { result } = await mount();
    const seenA: ScheduledStep[] = [];
    const seenB: ScheduledStep[] = [];
    const unsubA = result.current.subscribeSteps((s) => seenA.push(s));
    result.current.subscribeSteps((s) => seenB.push(s));

    fakes.ctx.currentTime = 0;
    vi.useFakeTimers();
    try {
      act(() => {
        result.current.play();
      });
      runScheduler(2000);
      act(() => result.current.stopPlaying());
    } finally {
      vi.useRealTimers();
      fakes.ctx.currentTime = 0;
    }

    expect(seenA.length).toBeGreaterThan(0);
    // both listeners heard the exact same sequence — the fan-out is not
    // dropping or reordering anything between subscribers
    expect(seenB).toEqual(seenA);
    // and what is handed over is a real scheduled step, not a bare marker
    expect(seenA[0]).toMatchObject({ t: expect.any(Number), slot: expect.any(Number) });

    unsubA();
  });

  it('stops delivering to a listener once it has unsubscribed, while others keep hearing steps', async () => {
    const { result } = await mount();
    const seenA: ScheduledStep[] = [];
    const seenB: ScheduledStep[] = [];
    const unsubA = result.current.subscribeSteps((s) => seenA.push(s));
    result.current.subscribeSteps((s) => seenB.push(s));

    fakes.ctx.currentTime = 0;
    vi.useFakeTimers();
    let seenBeforeUnsub = 0;
    try {
      act(() => {
        result.current.play();
      });
      runScheduler(500);
      seenBeforeUnsub = seenA.length;
      expect(seenBeforeUnsub).toBeGreaterThan(0);

      act(() => unsubA());
      runScheduler(2000);
      act(() => result.current.stopPlaying());
    } finally {
      vi.useRealTimers();
      fakes.ctx.currentTime = 0;
    }

    expect(seenA.length).toBe(seenBeforeUnsub); // nothing arrived after unsubscribing
    expect(seenB.length).toBeGreaterThan(seenBeforeUnsub); // the other listener kept going
  });

  it('reports 0 latency before any AudioContext exists', async () => {
    const { result } = await mount();
    expect(fakes.made.audio.at(-1)?.ctx).toBeNull();
    expect(result.current.audioLatency()).toBe(0);
  });

  it("sums the context's output and base latency once there is a context", async () => {
    const { result } = await mount();
    act(() => result.current.togglePlay()); // starts the transport, which inits the ctx
    fakes.ctx.outputLatency = 0.01;
    fakes.ctx.baseLatency = 0.005;

    expect(result.current.audioLatency()).toBeCloseTo(0.015, 6);
  });

  it('clamps latency to [0, 0.5], in both directions', async () => {
    const { result } = await mount();
    act(() => result.current.togglePlay());

    fakes.ctx.outputLatency = 2;
    fakes.ctx.baseLatency = 1;
    expect(result.current.audioLatency()).toBe(0.5);

    fakes.ctx.outputLatency = -5;
    fakes.ctx.baseLatency = -5;
    expect(result.current.audioLatency()).toBe(0);
  });
});

describe('swing set by the style', () => {
  const inRange = (v: number, [lo, hi]: [number, number]) => v >= lo && v <= hi;
  const range = (key: string): [number, number] => {
    const r = STYLES[key].swingRange;
    if (!r) throw new Error(`${key} has no swing range`);
    return r;
  };

  it('sets the swing in the style’s range, afresh on each New, until you move it', async () => {
    const { result } = await mount();
    act(() => result.current.setStyle('rockabilly'));
    expect(inRange(result.current.swing, range('rockabilly'))).toBe(true);
    expect(result.current.swingYours).toBe(false);

    const rolled = new Set<number>();
    for (let i = 0; i < 12; i++) {
      act(() => {
        result.current.newBreak('both');
      });
      expect(inRange(result.current.swing, range('rockabilly'))).toBe(true);
      rolled.add(result.current.swing);
    }
    expect(rolled.size).toBeGreaterThan(1);

    // yours, from the slider: New keeps it
    act(() => result.current.setSwing(33));
    expect(result.current.swingYours).toBe(true);
    act(() => {
      result.current.newBreak('both');
    });
    expect(result.current.swing).toBe(33);

    // picking a style hands it back
    act(() => result.current.setStyle('rocknroll'));
    expect(result.current.swingYours).toBe(false);
    expect(inRange(result.current.swing, range('rocknroll'))).toBe(true);
  });

  it('swings nothing over a compound meter the style was not written in', async () => {
    const { result } = await mount();
    act(() => result.current.setStyle('rockabilly'));
    act(() => result.current.setMeter('12/8'));
    act(() => {
      result.current.newBreak('both');
    });
    expect(result.current.meter).toBe('12/8');
    expect(result.current.swing).toBe(0);
  });

  it('leaves an open saved pattern’s swing alone when a style is picked for the next New', async () => {
    const payload = sharePayloadSchema.parse(JSON.parse(atob(codeFor('Saved', 90))));
    const { result } = await mount(
      { id: 'cbrk00000000000000000001', title: 'Saved', payload, mine: true },
      { stageSaved: () => true }
    );
    expect(result.current.swing).toBe(12);
    act(() => result.current.setStyle('rockabilly'));
    expect(result.current.swing).toBe(12);
    // the next New is written in that style, at its swing
    act(() => {
      result.current.newBreak('both');
    });
    expect(inRange(result.current.swing, range('rockabilly'))).toBe(true);
  });

  it('brings back with an Undo whose swing it was, as well as the swing', async () => {
    const { result } = await mount();
    act(() => result.current.setSwing(33));
    const payload = sharePayloadSchema.parse(JSON.parse(atob(codeFor('Buddy', 120))));
    act(() => {
      result.current.applyAssistant(payload, true);
    });
    expect(result.current.swing).toBe(12);
    expect(result.current.swingYours).toBe(false);

    act(() => result.current.undo());
    expect(result.current.swing).toBe(33);
    expect(result.current.swingYours).toBe(true);
  });
});

describe('sections past B (11-e-ii)', () => {
  it('writes a new section no longer than the break has room for', async () => {
    const { result } = await mount();
    act(() => {
      result.current.loadPayload(
        breakPayload({
          bpm: 120,
          swing: 0,
          level: 5,
          arrangement: ['A', 'B'],
          A: generatePattern({
            style: catalogue.styles.funk,
            meter: '4/4',
            seed: 5,
            bars: 2,
            density: 50,
            ghosts: 50,
          }),
          B: generatePattern({
            style: catalogue.styles.funk,
            meter: '4/4',
            seed: 6,
            bars: 1,
            density: 50,
            ghosts: 50,
          }),
        }),
        'Room'
      );
    });
    // 2 + 1, then three of 8 and one of 5: 32, the most a break holds
    act(() => result.current.setBars(8));
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.addSection();
      });
    }
    act(() => result.current.setBars(5));
    act(() => {
      result.current.addSection();
    });
    expect(result.current.letters).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    act(() => result.current.setViewMode('A'));
    act(() => result.current.setBars(8));
    act(() => {
      result.current.newBreak('A');
    });
    // A had 2 bars and there was room for no more
    expect(result.current.patterns.A?.bars).toHaveLength(2);
    const payload = result.current.payload();
    expect(sharePayloadSchema.safeParse(payload).success).toBe(true);
  });

  /** Bytes of a meta time-signature event: FF 58 04 nn dd 24 08. */
  const sigBytes = (num: number, den: number) => [0xff, 0x58, 0x04, num, Math.log2(den)];
  const countSig = (bytes: number[], num: number, den: number) => {
    const want = sigBytes(num, den);
    let n = 0;
    for (let i = 0; i + want.length <= bytes.length; i++) {
      if (want.every((b, j) => bytes[i + j] === b)) n++;
    }
    return n;
  };

  it('adds C in the pickers meter, plays it once at the end, and turns the view to it', async () => {
    const { result } = await mount();
    act(() => result.current.setMeter('7/8'));
    const arrBefore = result.current.arrangement;

    let ok = false;
    act(() => {
      ok = result.current.addSection();
    });

    expect(ok).toBe(true);
    expect(result.current.letters).toEqual(['A', 'B', 'C']);
    expect(result.current.patterns.C?.meter).toBe('7/8');
    // A and B are as they were: the new section is C alone
    expect(result.current.patterns.A?.meter).toBe('4/4');
    expect(result.current.arrangement).toEqual([...arrBefore, 'C']);
    expect(result.current.viewMode).toBe('C');
    expect(result.current.editing).toBe('C');
  });

  it('adds D after C', async () => {
    const { result } = await mount();
    act(() => {
      result.current.addSection();
    });
    act(() => {
      result.current.addSection();
    });
    expect(result.current.letters).toEqual(['A', 'B', 'C', 'D']);
    expect(result.current.arrangement.slice(-2)).toEqual(['C', 'D']);
    expect(result.current.viewMode).toBe('D');
  });

  it('takes C and its slot back with one Undo, and returns both on Redo', async () => {
    const { result } = await mount();
    const arrBefore = result.current.arrangement;
    act(() => {
      result.current.addSection();
    });
    const withC = result.current.patterns.C;
    expect(withC).toBeTruthy();

    act(() => result.current.undo());
    expect(result.current.patterns.C).toBeUndefined();
    expect(result.current.letters).toEqual(['A', 'B']);
    expect(result.current.arrangement).toEqual(arrBefore);

    act(() => result.current.redo());
    expect(result.current.patterns.C).toEqual(withC);
    expect(result.current.arrangement).toEqual([...arrBefore, 'C']);
  });

  it('deletes C and every slot that plays it, and one Undo puts both back', async () => {
    const { result } = await mount();
    act(() => {
      result.current.addSection();
    });
    act(() => result.current.setArrangement(['A', 'C', 'B', 'C']));

    let ok = false;
    act(() => {
      ok = result.current.deleteSection('C');
    });
    expect(ok).toBe(true);
    expect(result.current.patterns.C).toBeUndefined();
    expect(result.current.letters).toEqual(['A', 'B']);
    expect(result.current.arrangement).toEqual(['A', 'B']);
    // the choice of C falls back to All, since the break has no C now
    expect(result.current.viewMode).toBe('both');

    act(() => result.current.undo());
    expect(result.current.letters).toEqual(['A', 'B', 'C']);
    expect(result.current.arrangement).toEqual(['A', 'C', 'B', 'C']);
  });

  it('keeps letters rather than renumbering when a middle section goes', async () => {
    const { result } = await mount();
    act(() => {
      result.current.addSection();
    });
    act(() => {
      result.current.addSection();
    });
    const d = result.current.patterns.D;
    act(() => {
      result.current.deleteSection('C');
    });
    expect(result.current.letters).toEqual(['A', 'B', 'D']);
    expect(result.current.patterns.D).toBe(d);
    // the freed letter is the next one added
    act(() => {
      result.current.addSection();
    });
    expect(result.current.letters).toEqual(['A', 'B', 'C', 'D']);
  });

  it('refuses to delete A or B, or a section the break does not have', async () => {
    const { result } = await mount();
    const before = result.current.patterns;
    const arr = result.current.arrangement;
    const out: boolean[] = [];
    act(() => {
      out.push(result.current.deleteSection('A'));
      out.push(result.current.deleteSection('B'));
      out.push(result.current.deleteSection('C'));
    });
    expect(out).toEqual([false, false, false]);
    expect(result.current.patterns).toBe(before);
    expect(result.current.arrangement).toBe(arr);
    expect(result.current.canUndo).toBe(false);
  });

  it('leaves an arrangement that played only the deleted section as A', async () => {
    const { result } = await mount();
    act(() => {
      result.current.addSection();
    });
    act(() => result.current.setArrangement(['C', 'C']));
    act(() => {
      result.current.deleteSection('C');
    });
    expect(result.current.arrangement).toEqual(['A']);
  });

  it('blocks a section that would take the break past 32 bars, and adds nothing', async () => {
    const { result } = await mount();
    act(() => result.current.setBars(8));
    act(() => {
      result.current.newBreak('both');
    });
    expect(result.current.patterns.A?.bars).toHaveLength(8);
    expect(result.current.addSectionBlocked).toBeNull();

    // 8 + 8 + 8 = 24, then 32
    act(() => {
      result.current.addSection();
    });
    act(() => {
      result.current.addSection();
    });
    expect(result.current.letters).toEqual(['A', 'B', 'C', 'D']);

    // 32 bars in, another 8 would make 40
    expect(result.current.addSectionBlocked).toMatch(/32 bars/);
    let ok = true;
    act(() => {
      ok = result.current.addSection();
    });
    expect(ok).toBe(false);
    expect(result.current.letters).toEqual(['A', 'B', 'C', 'D']);

    // back to 24 bars, an 8-bar section lands exactly on the cap and is allowed
    act(() => {
      result.current.deleteSection('D');
    });
    act(() => result.current.setBars(8));
    expect(result.current.addSectionBlocked).toBeNull();
  });

  it('writes a break of A and B as the version it always was, byte for byte (v5)', async () => {
    const { result } = await mount();
    const p = result.current.payload();
    expect(p?.ver).toBe(5);
    expect(p).not.toHaveProperty('C');
  });

  it('writes sections past B as a v6 payload that loads back whole, in their own meters', async () => {
    const first = await mount();
    const c = first.result;
    // A 4/4, B 4/4 (as generated), C 7/8, D 3/4
    act(() => c.current.setMeter('7/8'));
    act(() => {
      c.current.addSection();
    });
    act(() => c.current.setMeter('3/4'));
    act(() => {
      c.current.addSection();
    });
    act(() => c.current.setArrangement(['A', 'B', 'A', 'C', 'D']));
    expect(c.current.patterns.C?.meter).toBe('7/8');
    expect(c.current.patterns.D?.meter).toBe('3/4');

    const payload = c.current.payload();
    expect(payload?.ver).toBe(6);
    const wire: unknown = JSON.parse(JSON.stringify(payload));
    expect(wire).toHaveProperty('C');
    expect(wire).toHaveProperty('D');
    // it survives the schema the server validates with
    const parsed = sharePayloadSchema.parse(wire);

    const second = await mount();
    let ok = false;
    act(() => {
      ok = second.result.current.loadPayload(parsed, 'Mixed meters');
    });
    expect(ok).toBe(true);
    const r = second.result.current;
    expect(r.letters).toEqual(['A', 'B', 'C', 'D']);
    expect(r.patterns.A?.meter).toBe('4/4');
    expect(r.patterns.C?.meter).toBe('7/8');
    expect(r.patterns.D?.meter).toBe('3/4');
    expect(r.patterns.C?.bars).toEqual(c.current.patterns.C?.bars);
    expect(r.patterns.D?.bars).toEqual(c.current.patterns.D?.bars);
    expect(r.arrangement).toEqual(['A', 'B', 'A', 'C', 'D']);
    expect(r.patterns.A?.name).toBe('Mixed meters');

    // and it plays: the file changes signature at each meter change, in order
    act(() => r.setViewMode('both'));
    const bytes = second.result.current.midi()!.bytes;
    expect(countSig(bytes, 7, 8)).toBe(1);
    expect(countSig(bytes, 3, 4)).toBe(1);
    // 4/4 is written once, at the top: A, B and A again share it
    expect(countSig(bytes, 4, 4)).toBe(1);
    const at = (n: number, d: number) => {
      const want = sigBytes(n, d);
      return bytes.findIndex((_, i) => want.every((b, j) => bytes[i + j] === b));
    };
    expect(at(4, 4)).toBeLessThan(at(7, 8));
    expect(at(7, 8)).toBeLessThan(at(3, 4));
  });

  it('round-trips C and D through a share code too', async () => {
    const first = await mount();
    act(() => {
      first.result.current.addSection();
    });
    const code = first.result.current.shareCode();
    const second = await mount();
    let ok = false;
    act(() => {
      ok = second.result.current.loadCode(code);
    });
    expect(ok).toBe(true);
    expect(second.result.current.letters).toEqual(['A', 'B', 'C']);
    expect(second.result.current.arrangement).toEqual(first.result.current.arrangement);
  });

  it('drops sections past B and their slots on a whole new pattern, and Undo brings them back', async () => {
    const { result } = await mount();
    act(() => {
      result.current.addSection();
    });
    const withC = result.current.patterns.C;
    const arr = result.current.arrangement;
    expect(arr).toContain('C');

    act(() => {
      result.current.newBreak('both');
    });
    expect(result.current.letters).toEqual(['A', 'B']);
    expect(result.current.arrangement).not.toContain('C');
    expect(result.current.arrangement.length).toBeGreaterThan(0);
    expect(result.current.payload()?.ver).toBe(5);

    act(() => result.current.undo());
    expect(result.current.letters).toEqual(['A', 'B', 'C']);
    // restored from the undo stack's copy: equal notes, not the same object
    expect(result.current.patterns.C).toEqual(withC);
    expect(result.current.arrangement).toEqual(arr);
  });

  it('drops sections past B on opening a library entry, and Undo brings them back', async () => {
    const { result } = await mount();
    act(() => {
      result.current.addSection();
    });
    act(() => result.current.loadLibraryEntry('entry-0'));
    expect(result.current.letters).toEqual(['A', 'B']);
    expect(result.current.arrangement).not.toContain('C');

    act(() => result.current.undo());
    expect(result.current.letters).toEqual(['A', 'B', 'C']);
    expect(result.current.arrangement).toContain('C');
  });

  it('fixes a stored section choice the break has not got to All (viewIn)', async () => {
    const { result } = await mount();
    act(() => {
      result.current.addSection();
    });
    expect(result.current.viewMode).toBe('C');
    act(() => result.current.undo());
    expect(result.current.viewMode).toBe('both');
  });
});

describe('a section at a tempo ratio (11-e-ii-g)', () => {
  function abCode(bpm: number) {
    const funk = catalogue.styles.funk;
    const at = (seed: number) =>
      generatePattern({ style: funk, meter: '4/4', seed, bars: 1, density: 50, ghosts: 50 });
    return encodeBreak({ bpm, swing: 0, level: 5, arrangement: ['A', 'B'], A: at(5), B: at(6) });
  }

  it('plays B at double time, bringing the tempo down to the new ceiling; one Undo puts both back', async () => {
    const { result } = await mount();
    act(() => {
      result.current.loadCode(abCode(120));
    });
    expect(result.current.bpmCeiling).toBe(190);
    let ok = false;
    act(() => {
      ok = result.current.setSectionTempo('B', 2);
    });
    expect(ok).toBe(true);
    expect(result.current.patterns.B?.tempoRatio).toBe(2);
    expect(result.current.patterns.A?.tempoRatio).toBeUndefined();
    // 4/4 tops out at 190, so B at ×2 holds the break to 95
    expect(result.current.bpmCeiling).toBe(95);
    expect(result.current.bpm).toBe(95);
    act(() => result.current.undo());
    expect(result.current.patterns.B?.tempoRatio).toBeUndefined();
    expect(result.current.bpm).toBe(120);
  });

  it('takes a ratio off again at ×1, and refuses one it already plays at or a section it has not got', async () => {
    const { result } = await mount();
    act(() => {
      result.current.loadCode(abCode(90));
    });
    const out: boolean[] = [];
    act(() => {
      out.push(result.current.setSectionTempo('A', 1));
      out.push(result.current.setSectionTempo('C', 2));
    });
    expect(out).toEqual([false, false]);
    act(() => {
      result.current.setSectionTempo('A', 0.5);
    });
    expect(result.current.patterns.A?.tempoRatio).toBe(0.5);
    act(() => {
      result.current.setSectionTempo('A', 1);
    });
    expect(result.current.patterns.A).not.toHaveProperty('tempoRatio');
  });

  it('plays A at half time, raising a tempo under the floor to it, and holds the slider there', async () => {
    const { result } = await mount();
    act(() => {
      result.current.loadCode(abCode(70));
    });
    expect(result.current.bpmFloor).toBe(50);
    act(() => {
      result.current.setSectionTempo('A', 0.5);
    });
    // A at ×½ under 70 would play at 35: the break comes up to 100
    expect(result.current.bpmFloor).toBe(100);
    expect(result.current.bpm).toBe(100);
    act(() => result.current.setBpm(60));
    expect(result.current.bpm).toBe(100);
    act(() => result.current.undo());
    expect(result.current.bpm).toBe(70);
    expect(result.current.bpmFloor).toBe(50);
  });

  it('keeps the ratio through a new take of the section', async () => {
    const { result } = await mount();
    act(() => {
      result.current.loadCode(abCode(90));
    });
    act(() => {
      result.current.setSectionTempo('B', 2);
    });
    act(() => result.current.setViewMode('B'));
    const before = result.current.patterns.B;
    act(() => {
      result.current.regenerate();
    });
    expect(result.current.patterns.B).not.toBe(before);
    expect(result.current.patterns.B?.tempoRatio).toBe(2);
    act(() => {
      result.current.newBreak('B');
    });
    expect(result.current.patterns.B?.tempoRatio).toBe(2);
  });
});

describe('arrangementForNew', () => {
  const pat = generatePattern({
    style: catalogue.styles.funk,
    seed: 1,
    bars: 1,
    density: 50,
    ghosts: 50,
  });
  const AB = { A: pat, B: pat };

  it('takes a song’s order and puts yours aside', () => {
    expect(
      arrangementForNew({
        current: ['A', 'B'],
        playing: null,
        own: null,
        next: ['A', 'A', 'B', 'C'],
        sections: AB,
      })
    ).toEqual({ arrangement: ['A', 'A', 'B', 'C'], own: ['A', 'B'] });
  });

  it('keeps what was put aside from song to song', () => {
    expect(
      arrangementForNew({
        current: ['A', 'A', 'B'],
        playing: ['A', 'A', 'B'],
        own: ['B', 'A'],
        next: ['A', 'B', 'C'],
        sections: AB,
      }).own
    ).toEqual(['B', 'A']);
  });

  it('gives yours back, kept to the sections there are, when the song’s order is untouched', () => {
    expect(
      arrangementForNew({
        current: ['A', 'B', 'C'],
        playing: ['A', 'B', 'C'],
        own: ['A', 'C', 'B'],
        next: null,
        sections: AB,
      })
    ).toEqual({ arrangement: ['A', 'B'], own: null });
  });

  it('is the Studio’s own after an Undo back to a song, with nothing put aside', () => {
    expect(
      arrangementForNew({
        current: ['A', 'B'],
        playing: ['A', 'B'],
        own: null,
        next: null,
        sections: AB,
      }).arrangement
    ).toEqual(DEFAULT_ARRANGEMENT);
  });

  it('leaves an order that is not a song’s alone', () => {
    expect(
      arrangementForNew({
        current: ['B', 'B', 'A'],
        playing: ['A', 'B'],
        own: ['A'],
        next: null,
        sections: AB,
      }).arrangement
    ).toEqual(['B', 'B', 'A']);
  });
});
