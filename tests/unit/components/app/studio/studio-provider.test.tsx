// @vitest-environment happy-dom

/**
 * `StudioProvider` and `useStudio`, at the two edges the panel tests never hit.
 *
 * Every other component test mounts the provider correctly, which is the point
 * — they are testing panels. This file tests the provider's own contract: that
 * a consumer outside it fails loudly, and that the catalogue it is handed is
 * the catalogue its consumers read.
 *
 * The second one stopped being free in Phase 2. The provider used to fall back
 * to a compiled-in `codeCatalogue()`, so a page that forgot the prop rendered a
 * Studio with plausible content that was not the content in the database. The
 * prop is required now and there is no fallback, and this is what says so.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { DEFAULT_STUDIO_SETTINGS } from '@/lib/validations/studio-settings';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

function Probe() {
  const c = useStudio();
  return (
    <div>
      <span data-testid="styles">{Object.keys(c.catalogue.styles).length}</span>
      <span data-testid="libraries">{c.catalogue.libraries[0]?.entries.length}</span>
    </div>
  );
}

describe('useStudio', () => {
  it('throws outside a provider rather than handing back a null', () => {
    /* A silently stateless drawer is harder to diagnose than a failed render:
       every consumer is a piece of the Studio frame, so being outside the
       provider is always a wiring mistake and never a state to cope with. */
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useStudio must be used within a StudioProvider/);
    quiet.mockRestore();
  });
});

describe('StudioProvider', () => {
  it('hands its consumers the catalogue it was given, not one of its own', () => {
    const catalogue = testCatalogue();
    render(
      <StudioProvider catalogue={catalogue}>
        <Probe />
      </StudioProvider>
    );

    expect(screen.getByTestId('styles').textContent).toBe(
      String(Object.keys(catalogue.styles).length)
    );
    expect(screen.getByTestId('libraries').textContent).toBe(
      String(catalogue.libraries[0].entries.length)
    );
  });

  it('passes a catalogue through by identity, so a picker and the engine agree', () => {
    /* Not a deep copy. The console resolves a kit row out of this map and hands
       the object to the audio engine; a provider that cloned would give the
       engine a row that is `toEqual` the picker's and not `toBe` it, and the
       identity-keyed remap cache in `styleIn` would miss on every render. */
    const catalogue = testCatalogue();
    let seen: unknown;
    function Identity() {
      seen = useStudio().catalogue;
      return null;
    }
    render(
      <StudioProvider catalogue={catalogue}>
        <Identity />
      </StudioProvider>
    );
    expect(seen).toBe(catalogue);
  });
});

describe('StudioProvider openStyle (/studio?style=, a drummer’s Play)', () => {
  function StageProbe() {
    const c = useStudio();
    return (
      <div
        data-testid="stage"
        data-style={c.patterns.A?.style ?? ''}
        data-picked={c.style}
        data-leaving={c.leaving?.title ?? ''}
      />
    );
  }
  const stage = () => screen.getByTestId('stage');
  // the console keeps the last style in the browser; a test must not inherit it
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes a new break in the style once the console is ready', async () => {
    // the Studio starts in funk (the default start style), so arriving in funk would pass this
    expect(DEFAULT_STUDIO_SETTINGS.startStyle).toBe('funk');
    render(
      <StudioProvider catalogue={testCatalogue()} openStyle="rock">
        <StageProbe />
      </StudioProvider>
    );
    await waitFor(() => expect(stage().dataset.style).toBe('rock'));
    expect(stage().dataset.picked).toBe('rock');
  });

  it('opens in the usual style when no style is asked for', async () => {
    render(
      <StudioProvider catalogue={testCatalogue()}>
        <StageProbe />
      </StudioProvider>
    );
    await waitFor(() => expect(stage().dataset.style).toBe('funk'));
    expect(stage().dataset.picked).toBe('funk');
  });

  /*
   * AMBIGUOUS: the stage here is someone else's saved pattern with no edits of
   * the user's own. It prompts because picking the style (`setStyle`) is
   * itself counted as an edit to a saved document, as it is from Generate's
   * picker. `/studio?style=` has no saved pattern to meet, so this is the
   * only way the prompt is reachable; the contract pinned is "never replaced
   * behind the prompt's back", whichever way "dirty" is reached.
   */
  it('asks before replacing a saved pattern that would lose changes, and writes the break once answered', async () => {
    const funk = testStyle('funk');
    const A = generatePattern({
      style: funk,
      meter: '4/4',
      seed: 8,
      bars: 2,
      density: 50,
      ghosts: 50,
    });
    const initial: InitialPattern = {
      id: 'cbrk00000000000000000001',
      title: 'Cold Carpet',
      payload: breakPayload({
        bpm: 90,
        swing: 0,
        level: 5,
        arrangement: ['A', 'B'],
        A,
        B: deriveB(A, funk.params),
      }),
      mine: false,
    };
    function Answer() {
      const c = useStudio();
      return (
        <button type="button" onClick={() => void c.resolveLeave('discard')}>
          probe: discard
        </button>
      );
    }
    render(
      <StudioProvider catalogue={testCatalogue()} initial={initial} openStyle="rock">
        <StageProbe />
        <Answer />
      </StudioProvider>
    );

    await waitFor(() => expect(stage().dataset.leaving).toBe('Cold Carpet'));
    // asked, not replaced: the stage is still the pattern it was
    expect(stage().dataset.style).toBe('funk');

    screen.getByRole('button', { name: 'probe: discard' }).click();
    await waitFor(() => expect(stage().dataset.style).toBe('rock'));
    expect(stage().dataset.leaving).toBe('');
  });
});
