/**
 * Driving the app's `SelectMenu` (`components/app/ui/select-menu.tsx`) the way
 * a person does: open it, click the option. The trigger is a button whose
 * `value` is what is chosen, so reading one is still `.value`.
 */

import { fireEvent } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** The open list a trigger controls. */
export function menuOf(trigger: HTMLElement): HTMLElement {
  const id = trigger.getAttribute('aria-controls');
  const list = id ? document.getElementById(id) : null;
  if (!list) throw new Error(`the menu of ${trigger.id || 'this trigger'} is not open`);
  return list;
}

/** Open the menu, if it is not, and choose the option with this value (or, failing that, this label). */
export async function pickOption(
  user: UserEvent | null,
  trigger: HTMLElement,
  value: string
): Promise<void> {
  if (trigger.getAttribute('aria-expanded') !== 'true') {
    if (user) await user.click(trigger);
    else fireEvent.click(trigger);
  }
  const list = menuOf(trigger);
  const opt =
    list.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`) ??
    [...list.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (o) => o.querySelector('.selm-label')?.textContent === value
    );
  if (!opt) throw new Error(`no option "${value}" in ${trigger.id || 'the menu'}`);
  if (user) await user.click(opt);
  else fireEvent.click(opt);
}

/** Open the menu, if it is not: for a test that reads its options or groups by role. */
export async function openMenu(user: UserEvent | null, trigger: HTMLElement): Promise<HTMLElement> {
  if (trigger.getAttribute('aria-expanded') !== 'true') {
    if (user) await user.click(trigger);
    else fireEvent.click(trigger);
  }
  return menuOf(trigger);
}

/** The options a menu offers, opened if it has to be: value, label, disabled. */
export async function optionsOf(
  user: UserEvent | null,
  trigger: HTMLElement
): Promise<Array<{ value: string; text: string; disabled: boolean }>> {
  if (trigger.getAttribute('aria-expanded') !== 'true') {
    if (user) await user.click(trigger);
    else fireEvent.click(trigger);
  }
  return [...menuOf(trigger).querySelectorAll<HTMLElement>('[role="option"]')].map((o) => ({
    value: o.dataset.value ?? '',
    text: o.textContent ?? '',
    disabled: o.getAttribute('aria-disabled') === 'true',
  }));
}
