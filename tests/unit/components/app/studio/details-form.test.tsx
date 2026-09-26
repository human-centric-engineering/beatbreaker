// @vitest-environment happy-dom

/**
 * Details (task 4.11) — the name, description and reference links of the
 * pattern on the stage, and the link chips they put beside its title.
 *
 * The provider, the console, the form and the stage are real; the API is
 * mocked at `apiClient`, keeping the real `APIClientError`. Every refusal the
 * plan names is typed into the form as a person would, and each must be
 * refused before anything is sent, with a message that says what would work.
 *
 * @see components/app/studio/details-form.tsx
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
/* The history posts a visit whenever a saved pattern is on the stage; this
   file counts POSTs to /api/v1/breaks, so it is inert here. */
vi.mock('@/components/app/studio/use-practice-history', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/app/studio/use-practice-history')>();
  return {
    ...actual,
    usePracticeHistory: () => ({
      items: [],
      currentId: null,
      previous: null,
      following: null,
      step: () => {},
      open: () => {},
      clear: () => Promise.resolve(true),
    }),
  };
});
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { patch: vi.fn(), post: vi.fn(), get: vi.fn() } };
});

import type { InitialPattern } from '@/components/app/breaks/use-break-console';
import { DetailsForm } from '@/components/app/studio/details-form';
import { Stage } from '@/components/app/studio/stage';
import { StudioProvider, useStudio } from '@/components/app/studio/studio-provider';
import { APIClientError, apiClient } from '@/lib/api/client';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { LINK_RULE } from '@/lib/app/breaks/links';
import { breakPayload } from '@/lib/app/breaks/share';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

const ID = 'cbrk00000000000000000001';
const FUNKY = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s';
const TRACK = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC';

function saved(
  mine: boolean,
  details: InitialPattern['details'] = { description: '', links: [] }
): InitialPattern {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 8,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return {
    id: ID,
    title: 'Cold Carpet',
    payload: breakPayload({
      bpm: 90,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A,
      B: deriveB(A, funk.params),
    }),
    mine,
    details,
  };
}

function ToastProbe() {
  return <div role="status">{useStudio().toast}</div>;
}

/** A rename from elsewhere — what regenerating section A does to the name. */
function RenameProbe() {
  const c = useStudio();
  return (
    <button type="button" onClick={() => c.rename('Renamed elsewhere')}>
      probe: rename
    </button>
  );
}

/** The header's Save, without mounting the header. */
function SaveProbe() {
  const c = useStudio();
  return (
    <button type="button" onClick={() => void c.doc.save()}>
      probe: save
    </button>
  );
}

async function mount(initial?: InitialPattern) {
  render(
    <StudioProvider catalogue={testCatalogue()} initial={initial}>
      <Stage />
      <DetailsForm />
      <ToastProbe />
      <SaveProbe />
      <RenameProbe />
    </StudioProvider>
  );
  await screen.findByRole('heading', { level: 2 });
}

const addLink = async (user: ReturnType<typeof userEvent.setup>, url: string) => {
  await user.click(screen.getByRole('button', { name: 'Add a link' }));
  const inputs = screen.getAllByRole('textbox', { name: /^Link \d$/ });
  await user.type(inputs[inputs.length - 1], url);
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(apiClient.patch).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('DetailsForm — refusals', () => {
  it.each([
    ['a javascript: URL', 'javascript:alert(1)'],
    ['plain http', 'http://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['a look-alike host', 'https://youtube.com.example.net/watch?v=dQw4w9WgXcQ'],
    ['a userinfo trick', 'https://youtube.com@example.net/watch?v=dQw4w9WgXcQ'],
  ])('refuses %s, says what is accepted, and sends nothing', async (_what, url) => {
    const user = userEvent.setup();
    await mount(saved(true));

    await addLink(user, url);
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    expect(await screen.findByText(LINK_RULE)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Link 1' })).toHaveAttribute('aria-invalid', 'true');
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('will not take a fifth link, and says why', async () => {
    const user = userEvent.setup();
    await mount(saved(true));

    for (let i = 0; i < 4; i++) await addLink(user, FUNKY);

    expect(screen.getByRole('button', { name: 'Add a link' })).toBeDisabled();
    expect(screen.getByText('Up to 4 links — remove one to add another.')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: /^Link \d$/ })).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Remove link 4' }));
    expect(screen.getByRole('button', { name: 'Add a link' })).toBeEnabled();
  });

  it('refuses an empty name', async () => {
    const user = userEvent.setup();
    await mount(saved(true));

    await user.clear(screen.getByRole('textbox', { name: /Name/ }));
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    expect(await screen.findByText('A break needs a name')).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('refuses a link box left empty', async () => {
    const user = userEvent.setup();
    await mount(saved(true));

    await user.click(screen.getByRole('button', { name: 'Add a link' }));
    await user.type(screen.getByRole('textbox', { name: /Description/ }), 'x');
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    expect(await screen.findByText('Paste a link, or remove this one')).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
});

describe('DetailsForm — saving', () => {
  it('sends the description and the canonical links, then shows what the server kept', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockResolvedValue({
      description: 'The break at 5:21',
      links: [
        { kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s' },
        { kind: 'song', url: TRACK },
      ],
    });
    await mount(saved(true));

    await user.type(screen.getByRole('textbox', { name: /Description/ }), 'The break at 5:21');
    // typed with tracking junk and the short host; stored rebuilt from the id
    await addLink(user, 'https://youtu.be/dQw4w9WgXcQ?t=5m21s&si=tracking');
    await addLink(user, `${TRACK}?si=abc`);
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
    expect(apiClient.patch).toHaveBeenCalledWith(`/api/v1/breaks/${ID}`, {
      body: {
        description: 'The break at 5:21',
        links: [
          { kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s' },
          { kind: 'song', url: TRACK },
        ],
      },
    });
    expect(await screen.findByText('Details saved')).toBeInTheDocument();
    // the form shows what was stored, not what was typed
    expect(screen.getByRole('textbox', { name: 'Link 1' })).toHaveValue(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s'
    );
    expect(screen.getByRole('button', { name: 'Save details' })).toBeDisabled();
    // the chips follow what the server answered
    expect(screen.getByRole('link', { name: 'Video (opens in a new tab)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Song (opens in a new tab)' })).toBeInTheDocument();
  });

  it('keeps a new name and the typed links when the save fails — and renames nothing', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockRejectedValue(
      new APIClientError('Failed to fetch', 'NETWORK_ERROR')
    );
    await mount(saved(true));

    const name = screen.getByRole('textbox', { name: /Name/ });
    await user.clear(name);
    await user.type(name, 'Cold Carpet II');
    await user.type(screen.getByRole('textbox', { name: /Description/ }), 'From the lesson');
    await addLink(user, FUNKY);
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    expect(
      await screen.findByText('Could not reach the server — details not saved')
    ).toBeInTheDocument();
    // nothing typed is lost, and the stage keeps its name until a save lands
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('Cold Carpet II');
    expect(screen.getByRole('textbox', { name: /Description/ })).toHaveValue('From the lesson');
    expect(screen.getByRole('textbox', { name: 'Link 1' })).toHaveValue(FUNKY);
    expect(screen.getByRole('heading', { level: 2, name: 'Cold Carpet' })).toBeInTheDocument();
  });

  it('renames the stage once the details have saved, and leaves nothing unsaved', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockResolvedValue({ description: 'Slower', links: [] });
    await mount(saved(true));

    const name = screen.getByRole('textbox', { name: /Name/ });
    await user.clear(name);
    await user.type(name, 'Cold Carpet II');
    await user.type(screen.getByRole('textbox', { name: /Description/ }), 'Slower');
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Cold Carpet II' })).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save details' })).toBeDisabled()
    );
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('Cold Carpet II');
    expect(screen.getByRole('textbox', { name: /Description/ })).toHaveValue('Slower');
  });

  it('keeps what is being typed when the stage is renamed from elsewhere', async () => {
    const user = userEvent.setup();
    await mount(saved(true));

    await user.type(screen.getByRole('textbox', { name: /Description/ }), 'Half-typed');
    await addLink(user, FUNKY);
    await user.click(screen.getByRole('button', { name: 'probe: rename' }));

    await screen.findByRole('heading', { level: 2, name: 'Renamed elsewhere' });
    // the untouched name follows the stage; the edited fields stay as typed
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('Renamed elsewhere');
    expect(screen.getByRole('textbox', { name: /Description/ })).toHaveValue('Half-typed');
    expect(screen.getByRole('textbox', { name: 'Link 1' })).toHaveValue(FUNKY);
  });

  it('locks the description and links on a scratch pattern, and says why', async () => {
    await mount();

    expect(screen.getByRole('textbox', { name: /Description/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add a link' })).toBeDisabled();
    expect(
      screen.getByText('Save the pattern to give it a description and links.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save a copy' })).not.toBeInTheDocument();
  });

  it('renames a scratch pattern without calling the API', async () => {
    const user = userEvent.setup();
    await mount();

    const name = screen.getByRole('textbox', { name: /Name/ });
    await user.clear(name);
    await user.type(name, 'Kitchen floor');
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Kitchen floor' })).toBeTruthy();
    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("shows someone else's links read-only, and a copy of it carries them", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'cbrk00000000000000000002' });
    await mount(
      saved(false, { description: 'From the lesson', links: [{ kind: 'video', url: FUNKY }] })
    );

    expect(screen.getByRole('textbox', { name: /Description/ })).toBeDisabled();
    expect(screen.getByText(/Save a copy to change these/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'probe: save' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(vi.mocked(apiClient.post).mock.calls[0]?.[1]).toMatchObject({
      body: { description: 'From the lesson', links: [{ kind: 'video', url: FUNKY }] },
    });
  });

  it('Save a copy makes a new pattern under the name typed, with the saved links', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'cbrk00000000000000000002' });
    await mount(saved(true, { description: '', links: [{ kind: 'song', url: TRACK }] }));

    const name = screen.getByRole('textbox', { name: /Name/ });
    await user.clear(name);
    await user.type(name, 'Cold Carpet, slower');
    await user.click(screen.getByRole('button', { name: 'Save a copy' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(vi.mocked(apiClient.post).mock.calls[0]?.[1]).toMatchObject({
      body: { title: 'Cold Carpet, slower', links: [{ kind: 'song', url: TRACK }] },
    });
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Cold Carpet, slower' })
    ).toBeTruthy();
  });
});

describe('Link chips on the stage', () => {
  it('open in a new tab with noopener noreferrer, at the canonical URL', async () => {
    await mount(
      saved(true, {
        description: '',
        links: [
          { kind: 'video', url: FUNKY, label: 'Funky Drummer' },
          { kind: 'song', url: TRACK },
        ],
      })
    );

    const video = screen.getByRole('link', { name: 'Funky Drummer (opens in a new tab)' });
    expect(video).toHaveAttribute('href', FUNKY);
    expect(video).toHaveAttribute('target', '_blank');
    expect(video).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(video).getByText('▶')).toBeInTheDocument();

    const song = screen.getByRole('link', { name: 'Song (opens in a new tab)' });
    expect(song).toHaveAttribute('href', TRACK);
    expect(song).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not draw a stored link that no longer passes the allowlist', async () => {
    await mount(
      saved(true, { description: '', links: [{ kind: 'video', url: 'javascript:alert(1)' }] })
    );
    expect(screen.queryByRole('link', { name: /opens in a new tab/ })).not.toBeInTheDocument();
  });

  it('are not there on a scratch pattern', async () => {
    await mount();
    expect(screen.queryByRole('link', { name: /opens in a new tab/ })).not.toBeInTheDocument();
  });
});
