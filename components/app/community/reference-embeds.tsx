'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { type StoredLink, parseReferenceLink } from '@/lib/app/breaks/links';

const PROVIDER_NAMES = { youtube: 'YouTube', vimeo: 'Vimeo', spotify: 'Spotify' } as const;

/**
 * A pattern's reference links on its public page, as **click-to-load embeds**
 * (Phase 6, task 6.7).
 *
 * Each is a plain placeholder — "Play video from YouTube", "Listen on
 * Spotify" — that becomes an iframe only when pressed. Until then the page
 * makes no request to YouTube, Vimeo or Spotify and sets none of their
 * cookies. No thumbnail either: fetching one would be that request.
 *
 * The iframe's `src` is `embedUrl`, which `parseReferenceLink` builds from the
 * validated id alone — never the stored string — and `lib/app/csp.ts` allows
 * exactly those three embed origins. A stored link that no longer parses is
 * not drawn. The outbound link beside each carries `nofollow ugc`: the page is
 * user content.
 */
export function ReferenceEmbeds({ links }: { links: StoredLink[] }) {
  const parsed = links.flatMap((link) => {
    const ref = parseReferenceLink(link.url);
    return ref ? [{ ref, label: link.label }] : [];
  });
  if (!parsed.length) return null;

  return (
    <section aria-labelledby="reference-links" className="space-y-3">
      <h2 id="reference-links" className="text-lg font-semibold">
        Listen and watch
      </h2>
      <ul className="space-y-4">
        {parsed.map(({ ref, label }, i) => (
          <li key={i}>
            <Embed
              provider={PROVIDER_NAMES[ref.provider]}
              kind={ref.kind}
              embedUrl={ref.embedUrl}
              canonicalUrl={ref.canonicalUrl}
              label={label}
            />
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        Pressing play loads content from YouTube, Vimeo or Spotify, who may set cookies.
      </p>
    </section>
  );
}

function Embed({
  provider,
  kind,
  embedUrl,
  canonicalUrl,
  label,
}: {
  provider: string;
  kind: 'video' | 'song';
  embedUrl: string;
  canonicalUrl: string;
  label?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const action = kind === 'video' ? `Play video from ${provider}` : `Listen on ${provider}`;
  const title = label ? `${action} — ${label}` : action;

  if (loaded) {
    return (
      <iframe
        src={embedUrl}
        title={title}
        className={
          kind === 'video' ? 'aspect-video w-full rounded-md' : 'h-[152px] w-full rounded-md'
        }
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <Button type="button" variant="secondary" onClick={() => setLoaded(true)}>
        <span aria-hidden="true" className="mr-2">
          {kind === 'video' ? '▶' : '♫'}
        </span>
        {action}
      </Button>
      {label ? <span className="text-sm">{label}</span> : null}
      <a
        href={canonicalUrl}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="text-muted-foreground text-sm underline"
      >
        Open on {provider}
      </a>
    </div>
  );
}
