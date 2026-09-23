import type { Metadata } from 'next';
import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminKits, adminLibraries, adminStyles } from '@/lib/app/breaks/catalogue/admin-lists';

/**
 * The catalogue, for an operator.
 *
 * Rendered on the server from the database rather than fetched in an effect:
 * it is three queries in the same process, and a client fetch would be a round
 * trip to ask this app what it already knows. That also settles the "no N+1"
 * rule by construction — the version and entry counts come back with the rows.
 *
 * Deliberately **not** cached. The public data layer memoises, which is right
 * for a picker read on every page load and wrong for the page an admin reloads
 * to check the edit they just made.
 *
 * Authentication is `app/admin/layout.tsx`, which is the one gate for
 * everything under `/admin`.
 */

export const metadata: Metadata = {
  title: 'Catalogue',
  description: 'The styles, famous breaks and kits BeatBreaker generates from.',
};

export default async function AdminCataloguePage() {
  const [styles, libraries, kits] = await Promise.all([
    adminStyles(),
    adminLibraries(),
    adminKits(),
  ]);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Catalogue</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          The content the generator works from. Everything here is a database row, seeded on a fresh
          install and editable without a deploy. A style is never edited in place — saving a change
          writes a new version, and every break already generated keeps pointing at the version that
          made it.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Styles ({styles.length})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Style</TableHead>
              <TableHead>Heading</TableHead>
              <TableHead>Meter</TableHead>
              <TableHead className="text-right">Version</TableHead>
              <TableHead className="text-right">Versions kept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {styles.map((style) => (
              <TableRow key={style.id}>
                <TableCell>
                  <Link href={`/admin/catalogue/styles/${style.key}`} className="underline">
                    {style.label}
                  </Link>
                  <span className="text-muted-foreground block font-mono text-xs">{style.key}</span>
                </TableCell>
                <TableCell>{style.group}</TableCell>
                <TableCell>{style.meter}</TableCell>
                <TableCell className="text-right">{style.currentVersion}</TableCell>
                <TableCell className="text-right">{style.versionCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pattern libraries</h2>
        {libraries.map((library) => (
          <div key={library.id} className="space-y-2">
            <h3 className="font-medium">
              {library.title}{' '}
              <span className="text-muted-foreground font-normal">
                — {library.entryCount} patterns
              </span>
            </h3>
            <p className="text-muted-foreground max-w-2xl text-sm">{library.description}</p>
            <ul className="text-sm">
              {library.groups.map((group) => (
                <li key={group.group}>
                  {group.group} — {group.count}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-muted-foreground text-sm">
          Entries are corrected through <code>/api/v1/admin/catalogue/libraries/…/entries</code>,
          which is what lets a credit be fixed without a deploy. Every correction records an audit
          entry.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kits ({kits.length})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kit</TableHead>
              <TableHead>Engine</TableHead>
              <TableHead>Heading</TableHead>
              <TableHead>Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.map((kit) => (
              <TableRow key={kit.id}>
                <TableCell>
                  {kit.label}
                  <span className="text-muted-foreground block font-mono text-xs">{kit.key}</span>
                </TableCell>
                <TableCell>{kit.engine}</TableCell>
                <TableCell>{kit.group}</TableCell>
                <TableCell className="text-muted-foreground max-w-xs text-xs">
                  {kit.credit ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
