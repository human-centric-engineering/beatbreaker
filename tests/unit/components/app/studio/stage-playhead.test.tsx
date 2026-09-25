// @vitest-environment happy-dom

/**
 * The playhead effect in `stage.tsx` (lines ~45-68) only does anything once
 * `c.position` is a real, non-null `PlayEvent` — which only happens while the
 * real `Transport` is scheduling steps against a live `AudioContext.currentTime`.
 * This test environment has no Web Audio (see `stage.test.tsx` and
 * `studio-frame.test.tsx`'s "survives a browser with no Web Audio" tests, which
 * exist precisely because that is true), so those branches are structurally
 * unreachable through `<StudioProvider>` + a rendered `<Stage/>` alone.
 *
 * Rather than drive a real scheduler with a fake `AudioContext` clock — a
 * `requestAnimationFrame`-polling loop that a static, non-advancing fake clock
 * would spin forever, hanging the test — this file replaces `useStudio()` with
 * a hand-built `Studio` object and drives `c.position` directly across
 * re-renders. Everything else about the fixture (the generated pattern, the
 * catalogue) is real; only the one field this effect actually branches on is
 * under the test's control. `Stage` is the only thing under test: `Stave` and
 * `StepEditor` are unmocked, so what gets asserted is real DOM the playhead
 * effect produced via their public ref/props contract, not a spy call.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Stage } from '@/components/app/studio/stage';
import { type Studio } from '@/components/app/studio/studio-provider';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import type { PlayEvent } from '@/lib/app/breaks/audio/transport';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

let fake: Studio;

vi.mock('@/components/app/studio/studio-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/app/studio/studio-provider')>();
  return {
    ...actual,
    useStudio: () => fake,
  };
});

const noop = () => {
  /* not read by Stage */
};

beforeEach(() => {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 7,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  const B = deriveB(A, funk.params);

  fake = {
    ready: true,
    patterns: { A, B },
    view: { A, B },
    next: null,
    report: null,
    checks: null,
    tries: null,

    level: 5,
    setLevel: vi.fn(),
    viewMode: 'both',
    setViewMode: vi.fn(),
    editing: 'A',
    setEditing: vi.fn(),

    style: 'funk',
    setStyle: vi.fn(),
    meter: '4/4',
    setMeter: vi.fn(),
    bars: 2,
    setBars: vi.fn(),
    density: 50,
    setDensity: vi.fn(),
    ghosts: 50,
    setGhosts: vi.fn(),
    swing: 0,
    setSwing: vi.fn(),
    hats: 100,
    setHats: vi.fn(),
    feel: 100,
    setFeel: vi.fn(),
    lanesMode: 'style',
    setLanesMode: vi.fn(),
    customLanes: {},
    setCustomLanes: vi.fn(),

    bpm: 100,
    setBpm: vi.fn(),
    bpmCeiling: 200,
    playing: false,
    togglePlay: vi.fn(),
    loops: 0,
    position: null,

    kit: 'studio70',
    setKit: vi.fn(),
    sound: {},
    voice: 'k',
    setVoice: vi.fn(),
    setParam: vi.fn(),
    resetVoice: vi.fn(),
    resetKit: vi.fn(),
    kitTuned: false,
    kitSlots: 0,
    percSamples: false,
    setPercSamples: vi.fn(),
    percCount: 0,
    userNames: {},
    addSample: vi.fn().mockResolvedValue(''),
    removeSample: vi.fn().mockResolvedValue(undefined),
    mix: {},
    setLaneMix: vi.fn(),
    resetMix: vi.fn(),
    mixTouched: {},
    mute: {},
    toggleMute: vi.fn(),

    click: false,
    setClick: vi.fn(),
    clickSub: 4,
    setClickSub: vi.fn(),
    countIn: 0,
    setCountIn: vi.fn(),
    ramp: 0,
    setRamp: vi.fn(),
    ceiling: 140,
    setCeiling: vi.fn(),
    matchTempo: false,
    setMatchTempo: vi.fn(),

    arrangement: ['A', 'B'],
    setArrangement: vi.fn(),
    locks: {},
    toggleLock: vi.fn(),

    guides: false,
    setGuides: vi.fn(),
    sticking: false,
    setSticking: vi.fn(),
    preview: false,
    setPreview: vi.fn(),
    size: 1,
    setSize: vi.fn(),

    newBreak: vi.fn(),
    buildBFromA: vi.fn(),
    applyDoctor: vi.fn(),
    cycleCell: vi.fn(),
    loadLibraryEntry: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,

    clearSection: vi.fn(),

    shareCode: vi.fn(() => ''),
    shareLink: vi.fn(() => ''),
    loadCode: vi.fn(() => false),
    midiBase64: vi.fn(() => ''),
    auditionKit: vi.fn(() => false),
    midiPort: '',
    openMidiOut: vi.fn().mockResolvedValue(''),
    closeMidiOut: vi.fn(),
    audition: vi.fn(),

    catalogue: testCatalogue(),
    toast: '',
    say: noop,
  } as unknown as Studio;
});

/** The `.playhead` rect inside a given stave, found by its section label. */
const headOf = (letter: 'A' | 'B'): SVGRectElement => {
  const staves = screen.getAllByRole('img', { name: /Drum notation/ });
  // both sections are on screen (viewMode: 'both'); label text is 'A' or 'B'
  const idx = letter === 'A' ? 0 : 1;
  return staves[idx].parentElement!.querySelector('.playhead') as SVGRectElement;
};

describe('Stage playhead (position-driven branches)', () => {
  it('moves the playhead onto the A stave and marks the step-editor cursor there', () => {
    const position: PlayEvent = { t: 0, letter: 'A', barIdx: 0, slot: 0, secIdx: 0, count: false };
    const { rerender } = render(<Stage />);

    // before any position, neither stave shows a live playhead
    expect(headOf('A').getAttribute('width')).toBe('0');

    fake = { ...fake, position };
    rerender(<Stage />);

    // the A stave's playhead band now has real geometry, not the cleared 0×0 rect
    expect(headOf('A').getAttribute('width')).not.toBe('0');
    // and the B stave — not playing — stays cleared
    expect(headOf('B').getAttribute('width')).toBe('0');

    // the step editor (editing 'A', same section) marks the matching column —
    // one cell per lane, all at bar 0 step 0, none at any other step
    const marked = [...document.querySelectorAll('.cell.cursor')];
    expect(marked.length).toBeGreaterThan(0);
    expect(marked.every((el) => el.getAttribute('data-bar') === '0')).toBe(true);
    expect(marked.every((el) => el.getAttribute('data-slot') === '0')).toBe(true);
  });

  it('moves the playhead onto the B stave and clears A when B plays', () => {
    const position: PlayEvent = { t: 0, letter: 'B', barIdx: 0, slot: 0, secIdx: 1, count: false };
    fake = { ...fake, position };
    render(<Stage />);

    expect(headOf('B').getAttribute('width')).not.toBe('0');
    expect(headOf('A').getAttribute('width')).toBe('0');

    // editing is still 'A', so playing B does not mark a step-editor cursor
    expect(document.querySelectorAll('.cell.cursor').length).toBe(0);
  });

  it('marks the arrangement slot that is currently sounding', () => {
    const position: PlayEvent = { t: 0, letter: 'B', barIdx: 0, slot: 0, secIdx: 1, count: false };
    fake = { ...fake, position };
    render(<Stage />);

    const arr = document.querySelectorAll('.arr button');
    expect(arr[1]?.className).toContain('now');
    expect(arr[0]?.className ?? '').not.toContain('now');
  });
});
