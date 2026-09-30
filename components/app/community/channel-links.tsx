import {
  AtSign,
  Camera,
  Disc3,
  Drum,
  Globe,
  type LucideIcon,
  Music,
  Tv,
  Users,
  Video,
} from 'lucide-react';

import {
  CHANNEL_LABELS,
  type ChannelKind,
  type ChannelView,
} from '@/lib/app/breaks/community/channels';

/**
 * A drummer's channel links on their public page (Phase 7B, task 7B.4).
 *
 * Outbound links only, never embeds. `rel="me"` says the page and the channel
 * belong to the same person, and `nofollow ugc` says the link is theirs and
 * not ours. Each link is already canonical, rebuilt by the server from a
 * handle; what shows is the platform's name and the handle, or a website's
 * bare host. A drumming channel carries a drum mark, and the list arrives with
 * those first.
 */

const ICONS: Record<ChannelKind, LucideIcon> = {
  youtube: Video,
  instagram: Camera,
  tiktok: Video,
  x: AtSign,
  facebook: Users,
  twitch: Tv,
  soundcloud: Music,
  bandcamp: Disc3,
  website: Globe,
};

export function ChannelLinks({ channels }: { channels: ChannelView[] }) {
  if (!channels.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Channels">
      {channels.map((c) => {
        const Icon = ICONS[c.kind];
        return (
          <li key={c.url}>
            <a
              href={c.url}
              target="_blank"
              rel="me noopener noreferrer nofollow ugc"
              className="hover:bg-muted inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-sm"
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-medium">{CHANNEL_LABELS[c.kind]}</span>
                <span className="text-muted-foreground"> {c.display}</span>
              </span>
              {c.drumming ? (
                <Drum
                  className="text-primary size-4 shrink-0"
                  aria-label="About drumming"
                  role="img"
                />
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
