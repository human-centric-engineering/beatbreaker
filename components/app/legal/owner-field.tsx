/**
 * A fact only the owner can supply — the legal entity, the region, the minimum
 * age, the contact address — shown as `[OWNER: …]` until it is filled in
 * (task 8.9). Visible on purpose: a policy that went live with one of these
 * unfilled should look unfinished, not plausible. Launch waits on D7's review,
 * which replaces every one of them with the fact.
 *
 * `grep -rn "OwnerField" components/app/legal` lists what is left.
 */
export function OwnerField({ children }: { children: string }) {
  return (
    <mark className="bg-amber-100 px-1 text-amber-950 dark:bg-amber-900 dark:text-amber-50">
      [OWNER: {children}]
    </mark>
  );
}
