/**
 * The structural constants, read-only.
 *
 * GET /api/v1/catalogue/meters — the meters, the lanes and the kit slots.
 *
 * **These deliberately did not become rows** (D13). Meters, lanes and slots are
 * what the wire format is built on: a saved pattern is a row of digits per lane
 * at a meter's step count, so editing the set would not change a preference, it
 * would change what every stored pattern means. They stay in code and are
 * served here so a client — a native app especially (D14) — can render a grid
 * without a second implementation of the table.
 *
 * Authentication: none — see `…/styles`. Rate limiting is already done.
 */

import { catalogueResponse } from '@/app/api/v1/catalogue/_shared';
import { getRouteLogger } from '@/lib/api/context';
import { LANES, LANE_VALUES, PERC_INSTS, PERC_KEYS } from '@/lib/app/breaks/lanes';
import { METERS, METER_KEYS, stepsOf } from '@/lib/app/breaks/meter';
import { SLOTS, VOICE_KEYS, VOICE_LABEL } from '@/lib/app/breaks/kit';

export async function GET(request: Request): Promise<Response> {
  const log = await getRouteLogger(request);

  const data = {
    meters: METER_KEYS.map((key) => {
      const m = METERS[key];
      return {
        key,
        label: m.label,
        hint: m.hint,
        num: m.num,
        den: m.den,
        sub: m.sub,
        group: m.group,
        /* One step is always a sixteenth, whatever the meter — what a meter
           decides is how many of them a bar holds. A client that got the
           numerator and denominator but not this would have to re-derive it. */
        steps: stepsOf(m),
      };
    }),
    lanes: LANES.map((lane) => ({ key: lane, values: LANE_VALUES[lane] })),
    /* No `?? key` fallback: `PERC_KEYS` is `Object.keys(PERC_INSTS)`, so a key
       with no entry cannot exist. A fallback here would be a branch nothing can
       reach, which is worse than none — it reads as a case somebody considered. */
    percussion: PERC_KEYS.map((key) => ({ key, label: PERC_INSTS[key].label })),
    slots: SLOTS,
    voices: VOICE_KEYS.map((key) => ({ key, label: VOICE_LABEL[key] })),
  };

  log.info('Catalogue structural constants read');
  return catalogueResponse(request, data);
}
