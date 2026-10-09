import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

import { testCatalogue } from '@/tests/helpers/catalogue';

/**
 * Pick a style in the Studio's style picker the way a person does: open the
 * crate from the trigger labelled "Style", then click the style's card. The
 * card is found by its name, which is the start of its accessible name (the
 * facts and the blurb follow it).
 */
export async function pickStyle(user: UserEvent, key: string): Promise<void> {
  const label = testCatalogue().styles[key]?.params.label;
  if (!label) throw new Error(`no style "${key}" in the test catalogue`);
  await user.click(screen.getByLabelText('Style'));
  const list = await screen.findByRole('listbox');
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await user.click(within(list).getByRole('option', { name: new RegExp(`^${escaped}`) }));
}
