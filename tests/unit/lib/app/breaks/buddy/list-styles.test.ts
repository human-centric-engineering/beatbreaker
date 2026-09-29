/**
 * `list_styles`: the catalogue as the model needs it to choose a key. The
 * catalogue is the seed data, read through a mocked `listStyles`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dataOf } from '@/tests/helpers/buddy';
import { testStyles } from '@/tests/helpers/catalogue';

vi.mock('@/lib/app/breaks/catalogue/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/app/breaks/catalogue/data')>()),
  listStyles: vi.fn(),
}));

import { ListStylesCapability } from '@/lib/app/breaks/buddy/list-styles';
import { listStyles } from '@/lib/app/breaks/catalogue/data';

beforeEach(() => {
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

describe('list_styles', () => {
  it('lists every catalogue style with its key, label, group, hint, tempo range, meter and swing', async () => {
    const cap = new ListStylesCapability();
    const result = await cap.execute(cap.validate({}), { userId: 'user-1', agentId: 'agent-1' });

    const styles = Object.values(testStyles());
    expect(dataOf(result).styles).toHaveLength(styles.length);
    const funk = dataOf(result).styles.find((s) => s.key === 'funk');
    const row = testStyles().funk;
    expect(funk).toEqual({
      key: 'funk',
      label: row.params.label,
      group: row.group,
      hint: row.params.hint,
      bpm: row.params.bpm,
      meter: row.params.meter ?? '4/4',
      swing: row.params.swing,
    });
  });

  it('follows the catalogue: a style added there is listed with no code change', async () => {
    const extra = { ...testStyles().funk, key: 'new-style', group: 'New' };
    vi.mocked(listStyles).mockResolvedValue([extra]);

    const cap = new ListStylesCapability();
    const result = await cap.execute({}, { userId: null, agentId: 'agent-1' });
    expect(dataOf(result).styles.map((s) => s.key)).toEqual(['new-style']);
  });
});
