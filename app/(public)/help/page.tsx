import type { Metadata } from 'next';
import Link from 'next/link';

import { ShowTourAgain } from '@/components/app/help/show-tour-again';
import { DRAWERS } from '@/components/app/shell/drawer-guide';
import { STUDIO_TOOLS } from '@/components/app/shell/studio-address';
import { ShortcutsTable } from '@/components/app/shell/shortcuts-table';

/**
 * Help — `/help` (task 8.7). Public, so it can be read before signing up.
 *
 * The shortcuts are the table the Studio's key handler walks and the `?` sheet
 * draws, and the drawers are the titles the drawers are built with, so this
 * page can't list a key that does nothing or a drawer by an old name.
 */

export const metadata: Metadata = {
  title: 'Help',
  description:
    'Keyboard shortcuts, what each Studio drawer is for, and what to do when the Studio is silent on an iPhone.',
  alternates: { canonical: '/help' },
};

export default function HelpPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Help</h1>
        <p className="text-muted-foreground">
          The Studio is where you read, play and change a break. The chart takes the window, and
          everything else opens in a drawer over it.
        </p>
        <ShowTourAgain />
      </header>

      <section aria-labelledby="help-drawers" className="space-y-3">
        <h2 id="help-drawers" className="text-xl font-semibold">
          The drawers
        </h2>
        <dl className="space-y-3">
          {STUDIO_TOOLS.map((tool) => (
            <div key={tool}>
              <dt className="font-medium">{DRAWERS[tool].title}</dt>
              <dd className="text-muted-foreground text-sm">{DRAWERS[tool].help}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="help-shortcuts" className="space-y-3">
        <h2 id="help-shortcuts" className="text-xl font-semibold">
          Keyboard shortcuts
        </h2>
        <p className="text-muted-foreground text-sm">
          In the Studio, press <kbd className="font-mono">?</kbd> for this list. None of them fire
          while you are typing in a field. On Windows and Linux, ⌘ is Ctrl and ⌥ is Alt.
        </p>
        <ShortcutsTable />
      </section>

      <section aria-labelledby="help-iphone" className="space-y-3">
        <h2 id="help-iphone" className="text-xl font-semibold">
          No sound on an iPhone or iPad
        </h2>
        <p className="text-muted-foreground text-sm">
          The ring/silent switch mutes the Studio, even with the volume up. If the playhead moves
          and you hear nothing, flip the switch to ring.
        </p>
      </section>

      <section aria-labelledby="help-breaks" className="space-y-3">
        <h2 id="help-breaks" className="text-xl font-semibold">
          The famous breaks
        </h2>
        <p className="text-muted-foreground text-sm">
          The famous breaks are study versions, credited to the drummers who played them. If one is
          wrong, or it is yours and you want it changed or taken down,{' '}
          <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
            tell us through the contact form
          </Link>{' '}
          and name the break.
        </p>
      </section>
    </div>
  );
}
