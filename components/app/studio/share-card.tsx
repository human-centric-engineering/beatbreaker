'use client';

import { useState } from 'react';

import { PublishDialog } from '@/components/app/studio/publish-dialog';
import { useStudio } from '@/components/app/studio/studio-provider';
import { publicPath } from '@/lib/app/breaks/community/visibility';

/**
 * Who can open the pattern on the stage (Phase 6, task 6.4): _Share with a
 * link_, the link, and _Stop sharing_. At the top of Share & export, under
 * the details. Copy is site-copy §6, _Share dialog_.
 *
 * Only a saved pattern of yours can be shared: a link names a row, and the
 * row is what a stranger opens. A scratch pattern still has _Copy break
 * code_ below, which carries the notes themselves.
 */
export function ShareCard() {
  const c = useStudio();
  const { doc, say } = c;
  const { visibility, slug } = doc.sharing;
  const copyLabel = doc.copyKind === 'variation' ? 'Save as variation' : 'Save a copy';
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const publishButton = (
    <button type="button" className="mini" disabled={busy} onClick={() => setPublishing(true)}>
      Publish…
    </button>
  );

  const change = async (next: 'private' | 'link') => {
    setBusy(true);
    try {
      await doc.share(next);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (path: string) => {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      say('Link copied');
    } catch {
      say('Copy blocked — select the link and copy it', { error: true });
    }
  };

  const link = slug && visibility !== 'private' ? publicPath(slug) : null;

  let body: React.ReactNode;
  if (!doc.id) {
    body = <p className="hint">Save the pattern to share it with a link.</p>;
  } else if (!doc.mine) {
    body = link ? (
      <>
        <p className="hint">Someone else&apos;s pattern. {copyLabel} to share one of your own.</p>
        <LinkRow path={link} onCopy={copyLink} />
      </>
    ) : (
      <p className="hint">Someone else&apos;s pattern. {copyLabel} to share one of your own.</p>
    );
  } else if (visibility === 'private') {
    body = (
      <>
        <p className="hint">Only you can open it.</p>
        <div className="btnrow">
          <button
            type="button"
            className="mini"
            disabled={busy}
            onClick={() => void change('link')}
          >
            Share with a link
          </button>
          {publishButton}
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="hint">
          {visibility === 'published'
            ? 'Published in the community library, under your username.'
            : "Anyone with this link can read and play the pattern. It won't appear in the community library."}
        </p>
        {link ? <LinkRow path={link} onCopy={copyLink} /> : null}
        <div className="btnrow">
          {visibility === 'published' ? (
            <button
              type="button"
              className="mini"
              disabled={busy}
              onClick={() => void change('link')}
            >
              Unpublish
            </button>
          ) : (
            publishButton
          )}
          <button
            type="button"
            className="mini"
            disabled={busy}
            onClick={() => void change('private')}
          >
            Stop sharing
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="card">
      <div className="card-hd">
        <h3>Share with a link</h3>
      </div>
      <div className="card-bd">{body}</div>
      <PublishDialog open={publishing} onOpenChange={setPublishing} />
    </div>
  );
}

function LinkRow({ path, onCopy }: { path: string; onCopy: (path: string) => Promise<void> }) {
  return (
    <div className="btnrow">
      <a className="mono" href={path} target="_blank" rel="noopener noreferrer">
        {path}
      </a>
      <button type="button" className="mini" onClick={() => void onCopy(path)}>
        Copy link
      </button>
    </div>
  );
}
