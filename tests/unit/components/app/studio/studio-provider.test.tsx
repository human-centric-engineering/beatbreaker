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

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

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
