/**
 * What the community pages show while the server reads the library (Phase 6):
 * the page's frame and a line saying what is coming, so a slow database is a
 * wait rather than a blank. Plain on purpose — nothing here needs data.
 */
export function CommunityLoading({ label }: { label: string }) {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10" role="status" aria-live="polite">
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
