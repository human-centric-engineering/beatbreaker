'use client';

import { useState } from 'react';

import { parseVideoLink, VIDEO_PLATFORM_LABELS } from '@/lib/app/breaks/community/video-links';

/**
 * The video on a row of a speed table (Phase 7C, D29) — the one thing that
 * backs a self-reported speed up.
 *
 * YouTube and Vimeo are **click-to-load**, as a pattern's reference links are
 * on the same page: nothing is fetched from either until _Play_ is pressed,
 * and the iframe's `src` is the embed URL `parseVideoLink` builds from the
 * validated id alone. Instagram, TikTok and X are outbound links only, so the
 * page's frame list does not grow. A stored link that no longer parses is not
 * drawn.
 */
export function SpeedVideo({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const video = parseVideoLink(url);
  if (!video) return null;
  const platform = VIDEO_PLATFORM_LABELS[video.platform];

  if (!video.embedUrl) {
    return (
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="text-sm underline"
      >
        Video on {platform}
      </a>
    );
  }
  if (!open) {
    return (
      <button type="button" className="text-sm underline" onClick={() => setOpen(true)}>
        <span aria-hidden="true">▶ </span>
        Play video from {platform}
      </button>
    );
  }
  return (
    <iframe
      src={video.embedUrl}
      title={`${title} — video from ${platform}`}
      className="aspect-video w-full max-w-md rounded-md"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      loading="lazy"
    />
  );
}
