'use client';

import { PhoneTransport, TransportLeds } from '@/components/app/shell/studio-transport';
import { useStudio } from '@/components/app/studio/studio-provider';
import { useConsent } from '@/lib/consent';
import { beatOf } from '@/lib/app/breaks/audio/transport';

/**
 * The Studio's footer.
 *
 * Wide, it is the read-out that used to sit at the right of the console's top
 * bar — where you are in the break, and the lamps — plus the one legal control a
 * page must always offer. On a phone it is the transport and nothing else: the
 * tools moved into the header menu precisely so that this line could belong to
 * Play (Spike A).
 */
export function StudioFooter() {
  const c = useStudio();
  const { openPreferences } = useConsent();

  const pos = c.position;
  const at = pos && !pos.count && pos.letter ? pos.letter : null;

  return (
    <footer className="studio-footer">
      <PhoneTransport />

      <span className="studio-footer-meta">
        <span className="studio-readout mono">
          {at && pos ? (
            <>
              <b>{at}</b> · bar <b>{(pos.barIdx ?? 0) + 1}</b> · beat{' '}
              <b>{beatOf(c.view[at], pos.slot)}</b> · loop <b>{c.loops}</b>
            </>
          ) : (
            <>
              <b>–</b> · bar <b>–</b> · beat <b>–</b> · loop <b>{c.loops}</b>
            </>
          )}
        </span>
        <TransportLeds />
        <span className="studio-spacer" />
        <button type="button" onClick={openPreferences} className="studio-footer-link">
          Cookie preferences
        </button>
      </span>
    </footer>
  );
}
