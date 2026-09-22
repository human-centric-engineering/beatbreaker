/**
 * The Studio, arriving.
 *
 * `(protected)` has an error boundary but no loading state, which was harmless
 * while its pages fetched nothing (H11). `/studio/[id]` will fetch a pattern
 * server-side, so this group ships both from the start. Deliberately plain: the
 * frame's own fonts and tokens are not loaded yet at this point.
 */
export default function StudioLoading() {
  return (
    <div className="text-muted-foreground flex min-h-screen items-center justify-center text-sm">
      Writing you a break…
    </div>
  );
}
