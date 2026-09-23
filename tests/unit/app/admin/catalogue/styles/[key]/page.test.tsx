// @vitest-environment happy-dom

/**
 * `/admin/catalogue/styles/[key]` — one style's detail page.
 *
 * Two things worth pinning:
 *
 * 1. **404, not a crash, for a key that isn't there.** `adminStyle` returning
 *    `null` (the row was deleted or the key is wrong) must reach
 *    `notFound()`, not fall through and dereference `style.label`.
 * 2. **The editor gets the CURRENT version's params — not the newest row.**
 *    `style.versions` is ordered newest-first, and `versions[0]` would be a
 *    plausible but wrong read: if a write were ever interrupted after adding
 *    a version but before moving `currentVersion` (or a version is added out
 *    of band), the newest row and the current one differ. The page finds the
 *    version whose number matches `style.currentVersion` and hands the editor
 *    that one — this pins the `find`, not the array order.
 *
 * `StyleEditor` is a client component (`'use client'`, its own fetch/JSON
 * logic — covered by `style-editor.test.tsx`), so it is stubbed here to
 * capture what it was handed rather than exercised again.
 *
 * @see app/admin/catalogue/styles/[key]/page.tsx
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/catalogue/admin-lists', () => ({
  adminStyle: vi.fn(),
}));

vi.mock('@/components/app/admin/catalogue/style-editor', () => ({
  StyleEditor: (props: {
    styleKey: string;
    group: string;
    position: number;
    currentVersion: number;
    params: unknown;
  }) => <div data-testid="style-editor" data-params={JSON.stringify(props.params)} />,
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import AdminStylePage, { generateMetadata } from '@/app/admin/catalogue/styles/[key]/page';
import { adminStyle } from '@/lib/app/breaks/catalogue/admin-lists';
import { notFound } from 'next/navigation';

function styleDetail(overrides: Partial<Awaited<ReturnType<typeof adminStyle>>> = {}) {
  return {
    id: 's1',
    key: 'funk',
    label: 'Funk 16ths',
    hint: 'Stubblefield territory.',
    group: 'Funk and breaks',
    meter: '4/4',
    position: 0,
    currentVersion: 2,
    updatedAt: new Date('2026-09-23'),
    // `adminStyle` derives this from the rows it returns; keep them in step.
    versionCount: 3,
    versions: [
      {
        id: 'v3',
        version: 3,
        note: 'A later, uncommitted edit',
        params: { label: 'Newest, not current' },
        createdAt: new Date('2026-09-22'),
      },
      {
        id: 'v2',
        version: 2,
        note: 'Softened the ghost bias',
        params: { label: 'Current version' },
        createdAt: new Date('2026-09-10'),
      },
      {
        id: 'v1',
        version: 1,
        note: '',
        params: { label: 'Seeded' },
        createdAt: new Date('2026-01-01'),
      },
    ],
    ...overrides,
  };
}

function ctx(key = 'funk') {
  return { params: Promise.resolve({ key }) };
}

describe('/admin/catalogue/styles/[key]', () => {
  it('calls notFound() for a key adminStyle cannot resolve, rather than rendering', async () => {
    vi.mocked(adminStyle).mockResolvedValue(null);

    await expect(AdminStylePage(ctx('no-such-style'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('hands the editor the CURRENT version’s params, not versions[0]', async () => {
    vi.mocked(adminStyle).mockResolvedValue(styleDetail());

    const el = await AdminStylePage(ctx());
    render(el);

    const editor = screen.getByTestId('style-editor');
    const params = JSON.parse(editor.dataset.params ?? 'null') as { label: string };

    // versions[0] is v3 ("Newest, not current") — the page must not read
    // that. It must walk to the entry whose `version` equals `currentVersion`.
    expect(params.label).toBe('Current version');
  });

  it('falls back to an empty object when the current version is missing from the list', async () => {
    // A style whose currentVersion points at a row not present in the
    // versions array (shouldn't happen, but the page's `?? {}` is the
    // documented guard against it) must not crash the render.
    vi.mocked(adminStyle).mockResolvedValue(styleDetail({ currentVersion: 99 }));

    const el = await AdminStylePage(ctx());
    render(el);

    const editor = screen.getByTestId('style-editor');
    expect(editor.dataset.params).toBe('{}');
  });

  it('renders the style’s own label and hint from the resolved row', async () => {
    vi.mocked(adminStyle).mockResolvedValue(styleDetail());
    const el = await AdminStylePage(ctx());
    render(el);

    expect(screen.getByRole('heading', { name: 'Funk 16ths' })).toBeInTheDocument();
    expect(screen.getByText('Stubblefield territory.')).toBeInTheDocument();
  });

  it('generateMetadata titles the page from the key, without fetching the style', async () => {
    const meta = await generateMetadata(ctx());
    expect(meta.title).toBe('Style — funk');
    expect(adminStyle).not.toHaveBeenCalled();
  });
});
