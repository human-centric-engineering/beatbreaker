import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StyleEditor } from '@/components/app/admin/catalogue/style-editor';
import { adminStyle } from '@/lib/app/breaks/catalogue/admin-lists';

/**
 * One style, and its versions.
 *
 * The version list is the part worth showing: it is the record of what changed
 * and when, and it is what a break's `styleVersionId` points into. Nothing here
 * can edit an existing version — see the editor for why.
 *
 * Authentication is `app/admin/layout.tsx`.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: `Style — ${key}` };
}

export default async function AdminStylePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const style = await adminStyle(key);
  if (!style) notFound();

  const current = style.versions.find((v) => v.version === style.currentVersion);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link href="/admin/catalogue" className="text-muted-foreground text-sm underline">
          ← Catalogue
        </Link>
        <h1 className="text-2xl font-bold">{style.label}</h1>
        <p className="text-muted-foreground font-mono text-xs">{style.key}</p>
        <p className="max-w-2xl text-sm">{style.hint}</p>
      </header>

      <StyleEditor
        styleKey={style.key}
        group={style.group}
        position={style.position}
        currentVersion={style.currentVersion}
        params={current?.params ?? {}}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Versions</h2>
        <ul className="space-y-2 text-sm">
          {style.versions.map((version) => (
            <li key={version.id} className="flex gap-3">
              <span className="font-mono">v{version.version}</span>
              <span className="text-muted-foreground">
                {version.createdAt.toISOString().slice(0, 10)}
              </span>
              <span>{version.note || (version.version === 1 ? 'Seeded.' : '—')}</span>
              {version.version === style.currentVersion ? (
                <span className="font-medium">current</span>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Old versions are kept for ever, because breaks people have saved point at them. Deleting
          one would change patterns nobody touched.
        </p>
      </section>
    </div>
  );
}
