// @vitest-environment happy-dom

/**
 * `SpeedsCard` — _Your speeds_ in the Practise drawer (Phase 7C): record the
 * fastest tempo you can play the pattern on the stage well, at the layer you
 * are on, and see your progress and your place on its table.
 *
 * `useStudio()` is replaced with a hand-built `Studio` object, as
 * `stage-playhead.test.tsx` does, because the fields `SpeedsCard` reads
 * (`stagePin`, `bpm`, `level`, `doc.variationOf`, `doc.sharing`, `say`) are a
 * small slice of a much larger console. `useSpeeds`/`useTableTop` — the real
 * hooks — run underneath, driven by a mocked `apiClient`, so every assertion
 * is on what the card actually requested or sent.
 *
 * @see components/app/studio/panels/speeds-card.tsx
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let fake: import('@/components/app/studio/studio-provider').Studio;

vi.mock('@/components/app/studio/studio-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/app/studio/studio-provider')>();
  return { ...actual, useStudio: () => fake };
});
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } };
});

import { SpeedsCard } from '@/components/app/studio/panels/speeds-card';
import type { Studio } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import type { PinTarget } from '@/lib/validations/pins';
import type { SpeedRecordView, SpeedTableRow, YourSpeeds } from '@/lib/validations/speeds';

const BREAK_TARGET: PinTarget = { breakId: 'cbrk00000000000000000001' };
const ENTRY_ID = 'clib00000000000000000001';
const ENTRY_TARGET: PinTarget = { libraryEntryId: ENTRY_ID };
const say = vi.fn();

function makeFake(overrides: Partial<Studio> = {}): Studio {
  return {
    stagePin: BREAK_TARGET,
    bpm: 94.4,
    level: 2,
    doc: {
      variationOf: null,
      sharing: { visibility: 'private', slug: null, basedOn: null },
    },
    say,
    ...overrides,
  } as unknown as Studio;
}

function yourSpeeds(overrides: Partial<YourSpeeds> = {}): YourSpeeds {
  return {
    records: [],
    public: false,
    places: [],
    hasUsername: true,
    listSpeeds: 'keep',
    ...overrides,
  };
}

function speedRecord(overrides: Partial<SpeedRecordView> = {}): SpeedRecordView {
  return {
    id: 'cspd00000000000000000001',
    level: 2,
    bpm: 120,
    video: null,
    note: null,
    listed: false,
    recordedAt: '2026-09-29T12:00:00.000Z',
    title: 'Cold Carpet',
    ...overrides,
  };
}

function tableRow(overrides: Partial<SpeedTableRow> = {}): SpeedTableRow {
  return {
    id: 'cspd00000000000000000099',
    position: 1,
    username: 'ghostnotes',
    bpm: 130,
    recordedAt: '2026-09-29T12:00:00.000Z',
    video: null,
    ...overrides,
  };
}

/** `apiClient.get` answers `/api/v1/speed-records` and any table url differently. */
function mockGet(speeds: YourSpeeds, table: SpeedTableRow[] = []) {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url === '/api/v1/speed-records') return Promise.resolve(speeds);
    return Promise.resolve(table);
  });
}

function renderCard(
  overrides: Partial<Studio> = {},
  speeds = yourSpeeds(),
  table: SpeedTableRow[] = []
) {
  fake = makeFake(overrides);
  mockGet(speeds, table);
  return render(<SpeedsCard />);
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.delete).mockReset();
  say.mockReset();
});

describe('with nothing to record on', () => {
  it('says to save the pattern first, and offers no Mark button', () => {
    renderCard({ stagePin: null });

    expect(screen.getByText('Save this pattern to record your speeds on it.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark my speed/ })).not.toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no target, nothing to read
  });

  it('shows the variation hint and no Mark button while a variation is in progress', async () => {
    renderCard({
      doc: {
        variationOf: 'Cold Carpet',
        sharing: { visibility: 'private', slug: null, basedOn: null },
      },
    } as Partial<Studio>);

    const hint = await screen.findByText(
      /You're making a variation\. Save it to record speeds on it/
    );
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent('“Cold Carpet”');
    expect(screen.queryByRole('button', { name: /Mark my speed/ })).not.toBeInTheDocument();
  });
});

describe('marking a speed', () => {
  it('opens the form at the stage’s tempo and layer', async () => {
    const user = userEvent.setup();
    renderCard();

    const markBtn = await screen.findByRole('button', { name: 'Mark my speed · 94 bpm' });
    await user.click(markBtn);

    expect(screen.getByText('94 bpm')).toBeInTheDocument();
    expect(screen.getByText(/at Groove$/)).toBeInTheDocument();
  });

  it('shows the video rule, marks the field invalid, and disables Save for an off-allowlist link', async () => {
    const user = userEvent.setup();
    renderCard({}, yourSpeeds({ listSpeeds: 'keep' }));
    await user.click(await screen.findByRole('button', { name: 'Mark my speed · 94 bpm' }));

    const videoInput = screen.getByPlaceholderText<HTMLInputElement>(
      'https://www.youtube.com/watch?v=…'
    );
    await user.type(videoInput, 'https://example.com/video/1');

    expect(
      screen.getByText('Use an https link to a video on YouTube, Vimeo, Instagram, TikTok or X.')
    ).toBeInTheDocument();
    expect(videoInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

describe('asking once, on a public target', () => {
  it('offers list/keep buttons and posts the trimmed video and note with listed', async () => {
    const user = userEvent.setup();
    renderCard({}, yourSpeeds({ public: true, listSpeeds: 'ask' }));
    vi.mocked(apiClient.post).mockResolvedValue({});
    await user.click(await screen.findByRole('button', { name: 'Mark my speed · 94 bpm' }));

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    const videoInput = screen.getByPlaceholderText('https://www.youtube.com/watch?v=…');
    await user.type(videoInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const noteInput = document.getElementById('bb-speed-note') as HTMLInputElement;
    await user.type(noteInput, '  bit shaky on the ghosts  ');

    await user.click(screen.getByRole('button', { name: 'Save and list it' }));

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/speed-records', {
      body: {
        ...BREAK_TARGET,
        bpm: 94,
        level: 2,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        note: 'bit shaky on the ghosts',
        listed: true,
      },
    });
  });

  it('"Save, keep it off" posts listed: false', async () => {
    const user = userEvent.setup();
    renderCard({}, yourSpeeds({ public: true, listSpeeds: 'ask' }));
    vi.mocked(apiClient.post).mockResolvedValue({});
    await user.click(await screen.findByRole('button', { name: 'Mark my speed · 94 bpm' }));

    await user.click(screen.getByRole('button', { name: 'Save, keep it off' }));

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/speed-records', {
      body: { ...BREAK_TARGET, bpm: 94, level: 2, listed: false },
    });
  });
});

describe('once the setting is known', () => {
  it('shows one Save and a checkbox at the setting, and unchecking sends listed: false', async () => {
    const user = userEvent.setup();
    renderCard({}, yourSpeeds({ public: true, listSpeeds: 'list' }));
    vi.mocked(apiClient.post).mockResolvedValue({});
    await user.click(await screen.findByRole('button', { name: 'Mark my speed · 94 bpm' }));

    expect(screen.queryByRole('button', { name: 'Save and list it' })).not.toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: 'On the public table' });
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/speed-records', {
      body: { ...BREAK_TARGET, bpm: 94, level: 2, listed: false },
    });
  });

  it('sends no listed field and shows no checkbox on a non-public target', async () => {
    const user = userEvent.setup();
    renderCard({}, yourSpeeds({ public: false, listSpeeds: 'keep' }));
    vi.mocked(apiClient.post).mockResolvedValue({});
    await user.click(await screen.findByRole('button', { name: 'Mark my speed · 94 bpm' }));

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/speed-records', {
      body: { ...BREAK_TARGET, bpm: 94, level: 2 },
    });
  });
});

describe('the place line', () => {
  it.each([
    [1, 5, '1st'],
    [2, 41, '2nd'],
    [3, 10, '3rd'],
    [4, 10, '4th'],
    [11, 20, '11th'],
    [12, 20, '12th'],
    [13, 20, '13th'],
    [21, 30, '21st'],
    [22, 30, '22nd'],
    [111, 200, '111th'],
  ])('renders position %i of %i as %s', async (position, of, ordinal) => {
    renderCard(
      {},
      yourSpeeds({
        places: [{ level: 2, position, of }],
      })
    );

    const line = await screen.findByText(
      (_, el) => el?.tagName === 'P' && el.className === 'speeds-place'
    );
    expect(line).toHaveTextContent(`You're ${ordinal} of ${of} at Groove.`);
  });

  it('says to choose a username when public with no username and no place', async () => {
    renderCard({}, yourSpeeds({ public: true, hasUsername: false, places: [] }));

    expect(
      await screen.findByText('Choose a username in Settings to appear on this table.')
    ).toBeInTheDocument();
  });
});

describe('Latest records', () => {
  it('shows at most 5, each with a delete button that DELETEs', async () => {
    const user = userEvent.setup();
    const records = Array.from({ length: 6 }, (_, i) =>
      speedRecord({
        id: `cspd0000000000000000000${i}`,
        bpm: 100 + i,
        recordedAt: `2026-09-2${i}T12:00:00.000Z`,
      })
    );
    renderCard({}, yourSpeeds({ records }));
    vi.mocked(apiClient.delete).mockResolvedValue({});

    await screen.findByText('Latest');
    const list = document.querySelector('ul.speeds-recent') as HTMLElement;
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(5);

    const deleteButtons = within(list).getAllByRole('button');
    await user.click(deleteButtons[0]);

    expect(apiClient.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/speed-records\/cspd0000000000000000000\d$/)
    );
  });
});

describe('the public table', () => {
  it('reads a famous break’s table from the library-entries endpoint', async () => {
    renderCard({ stagePin: ENTRY_TARGET }, yourSpeeds({ public: true }), [tableRow()]);

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        `/api/v1/public/library-entries/${ENTRY_ID}/speeds`,
        { params: { level: 2, limit: 5 } }
      )
    );
  });

  it('reads a published pattern’s table from its slug', async () => {
    renderCard(
      {
        doc: {
          variationOf: null,
          sharing: { visibility: 'published', slug: 'cold-carpet', basedOn: null },
        },
      } as Partial<Studio>,
      yourSpeeds({ public: true }),
      [tableRow()]
    );

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/public/patterns/cold-carpet/speeds', {
        params: { level: 2, limit: 5 },
      })
    );
  });

  it('is never read for a private break', async () => {
    renderCard({}, yourSpeeds({ public: false }));

    await screen.findByRole('button', { name: 'Mark my speed · 94 bpm' });
    expect(vi.mocked(apiClient.get).mock.calls).toEqual([
      ['/api/v1/speed-records', { params: BREAK_TARGET }],
    ]);
  });

  it('shows position, @username, bpm, a video link, and the self-reported line', async () => {
    renderCard(
      {
        doc: {
          variationOf: null,
          sharing: { visibility: 'published', slug: 'cold-carpet', basedOn: null },
        },
      } as Partial<Studio>,
      yourSpeeds({ public: true }),
      [
        tableRow({
          position: 1,
          username: 'ghostnotes',
          bpm: 150,
          video: {
            platform: 'youtube',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
          },
        }),
      ]
    );

    await waitFor(() => expect(document.querySelector('.speeds-who')).not.toBeNull());
    expect(document.querySelector('.speeds-who')).toHaveTextContent('@ghostnotes');
    expect(document.querySelector('.speeds-pos')).toHaveTextContent('1');
    expect(screen.getByText('150')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'video' });
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
    expect(screen.getByText('Speeds are self-reported.')).toBeInTheDocument();
  });
});
