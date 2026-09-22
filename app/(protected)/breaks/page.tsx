import { permanentRedirect } from 'next/navigation';

/**
 * `/breaks` is where the console lived; the Studio is at `/studio`.
 *
 * Every share link handed out before this move points here, so the route stays
 * for good rather than being deleted. A 308 keeps the method and, more to the
 * point, **the browser carries the `#b=` fragment across a redirect to a target
 * that has none** — which is the only reason a link like `/breaks#b=…` still
 * opens the break it was made for.
 *
 * That is also why this must never become a redirect *with* a fragment of its
 * own, and why `/studio` gates itself in its page rather than sitting behind the
 * proxy's edge redirect (H5): the fragment never reaches the server, so a
 * sign-in round trip has to be handled in the browser.
 */
export default function BreaksRedirect(): never {
  permanentRedirect('/studio');
}
