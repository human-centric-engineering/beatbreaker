// @vitest-environment happy-dom

/**
 * `ScoreCard` on its own: the critic's number, one meter per dimension and
 * the six playability checks, read off what is drawn. That it re-scores after a
 * musical edit is in `doctor-panel.test.tsx`.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScoreCard } from '@/components/app/studio/panels/score-card';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

/** The report the card is drawing from, to hold it to. */
function Report() {
  const c = useStudio();
  return <output data-testid="report">{JSON.stringify(c.report ?? null)}</output>;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('ScoreCard', () => {
  it('shows the critic’s score, a meter per dimension, and the checks', async () => {
    render(
      <StudioProvider catalogue={testCatalogue()}>
        <ScoreCard />
        <Report />
      </StudioProvider>
    );
    /* The number and its "/100" are two nodes, so wait on the card, not on text. */
    await waitFor(() =>
      expect(document.querySelector('.scorenum')?.textContent).toMatch(/^\d+\/100$/)
    );
    const report = JSON.parse(screen.getByTestId('report').textContent) as {
      score: number;
      dims: { key: string }[];
      verdict: string;
    };

    expect(document.querySelector('.scorenum')?.textContent).toBe(`${report.score}/100`);
    expect([...document.querySelectorAll('.meter > span')].map((s) => s.textContent)).toEqual(
      report.dims.map((d) => d.key)
    );
    expect(document.querySelector('.verdict')?.textContent).toBe(report.verdict);
    const checks = document.querySelectorAll('.check');
    expect(checks.length).toBe(6);
    for (const check of checks) expect(check.querySelector('i')?.textContent).toMatch(/^[✓✕]$/);
  });
});
