// @vitest-environment happy-dom

/**
 * `StyleEditor` — the two forms on a style's admin page.
 *
 * What's worth pinning is the split documented on the component itself: the
 * shelf form (group, position) is a `PATCH` to `…/styles/[key]`, and the
 * params form is a `POST` to `…/styles/[key]/versions` that writes a *new*
 * version — there is no "save" for the current one. Mixing those two up
 * would silently overwrite a version instead of adding one.
 *
 * The other half of the component's whole reason to exist: the params
 * textarea is parsed and checked against `styleParamsSchema` client-side,
 * before any request goes out, so a bad weight is named with its field
 * rather than coming back as an opaque 400.
 *
 * @see components/app/admin/catalogue/style-editor.tsx
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StyleEditor } from '@/components/app/admin/catalogue/style-editor';
import { createMockFetchResponse } from '@/tests/helpers/mocks';
import { createMockRouter } from '@/tests/types/mocks';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

import { useRouter } from 'next/navigation';

/** A real seed style's params — valid `styleParamsSchema` input, not a stub. */
const FUNK_PARAMS = STYLES.funk;

const refresh = vi.fn();
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue(createMockRouter({ refresh }));
  mockFetch = vi.fn();
  global.fetch = mockFetch as unknown as typeof fetch;
});

function renderEditor(overrides: Partial<React.ComponentProps<typeof StyleEditor>> = {}) {
  return render(
    <StyleEditor
      styleKey="funk"
      group="Funk and breaks"
      position={0}
      currentVersion={2}
      params={FUNK_PARAMS}
      {...overrides}
    />
  );
}

/**
 * Every labelled field here nests a `FieldHelp` trigger button inside its
 * `<label>`, so `getByLabelText` matches both the field and the trigger (its
 * accessible name is "<field> More information"). Querying by id sidesteps
 * that rather than fighting it with an exact-string match that would be
 * equally accidental.
 */
function fieldById(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no element with id ${id}`);
  return el;
}

/** Set the params textarea's raw text directly — avoids userEvent choking on `{`/`}`. */
function setParamsText(text: string): void {
  fireEvent.change(fieldById('style-params'), { target: { value: text } });
}

describe('StyleEditor — client-side validation before send', () => {
  it('refuses invalid JSON, names the problem, and never calls fetch', async () => {
    const user = userEvent.setup();
    renderEditor();

    setParamsText('{ this is not json');
    await user.click(screen.getByRole('button', { name: /Save as version/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('refuses JSON that fails styleParamsSchema, naming the offending field, and never calls fetch', async () => {
    const user = userEvent.setup();
    renderEditor();

    // `label` has a min length of 1 — an empty one is exactly the kind of
    // mistake a JSON text box invites and a generated form would have
    // prevented structurally.
    setParamsText(JSON.stringify({ ...FUNK_PARAMS, label: '' }));
    await user.click(screen.getByRole('button', { name: /Save as version/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('label');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('names the whole style, not a blank field, when the validation issue has no field path', async () => {
    // `first.path.map(String).join('.') || 'style'` — a root-level issue (the
    // JSON parsed to something that is not an object at all) has an empty
    // `path`, which joins to `''`. Without the `|| 'style'` fallback the
    // reader would see a message that starts with a bare `: `, naming
    // nothing.
    const user = userEvent.setup();
    renderEditor();

    setParamsText('null');
    await user.click(screen.getByRole('button', { name: /Save as version/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/^style:/);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('StyleEditor — the two forms hit two different endpoints', () => {
  it('PATCHes the style itself for where it sits — group and position only', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(createMockFetchResponse({ success: true, data: { key: 'funk' } }));
    renderEditor();

    const groupInput = fieldById('style-group');
    await user.clear(groupInput);
    await user.type(groupInput, 'Jazz');

    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/admin/catalogue/styles/funk');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ group: 'Jazz', position: 0 });

    // A move never touches the versions endpoint.
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/versions'),
      expect.anything()
    );
  });

  it('sends the position the reader typed, not the one the page opened with', async () => {
    // Covers the position field's own onChange — the group field above
    // exercises `setShelf`, but position is a second, independent handler,
    // and a copy-paste bug there would leave the position always at its
    // initial value while looking identical in review.
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(createMockFetchResponse({ success: true, data: { key: 'funk' } }));
    renderEditor();

    const positionInput = fieldById('style-position') as HTMLInputElement;
    await user.clear(positionInput);
    await user.type(positionInput, '5');

    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ group: 'Funk and breaks', position: 5 });
  });

  it('POSTs a new version for what it plays — never PATCHes the current one', async () => {
    mockFetch.mockResolvedValue(createMockFetchResponse({ success: true, data: { version: 3 } }));
    renderEditor();

    // The default textarea content is already the valid params passed in as
    // a prop, so submitting untouched exercises the POST path directly.
    fireEvent.submit(screen.getByRole('button', { name: 'Save as version 3' }).closest('form')!);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/admin/catalogue/styles/funk/versions');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as { params: unknown; note: string };
    expect(body.params).toEqual(FUNK_PARAMS);
  });

  it('sends the "what changed" note the reader typed along with the version', async () => {
    // The note field's own onChange — nothing else in the form exercises it,
    // and a break here would mean six-months-later version history is
    // permanently blank regardless of what an admin types.
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(createMockFetchResponse({ success: true, data: { version: 3 } }));
    renderEditor();

    const noteInput = fieldById('style-note');
    await user.type(noteInput, 'Softened the ghost bias');
    fireEvent.submit(screen.getByRole('button', { name: 'Save as version 3' }).closest('form')!);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { params: unknown; note: string };
    expect(body.note).toBe('Softened the ghost bias');
  });
});

describe('StyleEditor — a rejected fetch still shows something, even without a status code', () => {
  it('falls back to a generic message when the shelf PATCH rejects with a non-Error', async () => {
    // `error instanceof Error ? error.message : 'That did not save'` — a
    // network failure or an aborted request can reject with something that
    // is not an `Error` (a string, a DOMException-like plain object). Without
    // the fallback branch the reader would see nothing at all, because
    // `error.message` would be `undefined`.
    const user = userEvent.setup();
    mockFetch.mockRejectedValue('the network connection was lost');
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not save');
  });

  it('falls back to a generic message when the version POST rejects with a non-Error', async () => {
    mockFetch.mockRejectedValue('the network connection was lost');
    renderEditor();

    fireEvent.submit(screen.getByRole('button', { name: 'Save as version 3' }).closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not save');
  });
});

describe('StyleEditor — the save button names the version it will write', () => {
  it.each([
    [1, 2],
    [2, 3],
    [7, 8],
  ])('shows "Save as version %i" when currentVersion is %i', (currentVersion, expectedNext) => {
    renderEditor({ currentVersion });
    expect(
      screen.getByRole('button', { name: `Save as version ${expectedNext}` })
    ).toBeInTheDocument();
  });
});

describe('StyleEditor — a server refusal is shown, not swallowed', () => {
  it('shows the reader something when the shelf PATCH is refused', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(createMockFetchResponse({ success: false }, 500));
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('500');
    // A refusal must not be reported as a save.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the reader something when the version POST is refused', async () => {
    mockFetch.mockResolvedValue(createMockFetchResponse({ success: false }, 400));
    renderEditor();

    fireEvent.submit(screen.getByRole('button', { name: 'Save as version 3' }).closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('400');
  });
});
