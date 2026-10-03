/**
 * Reading a rendered policy page (task 8.9): its text with the
 * `[OWNER: …]` fields taken out, so a scan for leftovers sees only what the
 * page asserts, not the owner's to-do list.
 */
export function textWithoutOwnerFields(root: HTMLElement = document.body): string {
  const copy = root.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('mark').forEach((m) => {
    if (m.textContent?.startsWith('[OWNER:')) m.remove();
  });
  return (copy.textContent ?? '').replace(/\s+/g, ' ');
}

/** Every `[OWNER: …]` field on the page, as the reader sees it. */
export function ownerFields(root: HTMLElement = document.body): string[] {
  return [...root.querySelectorAll('mark')].map((m) => m.textContent ?? '');
}
