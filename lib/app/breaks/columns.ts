import { type BreakDoc, breakDocFromPayload } from '@/lib/app/breaks/share';
import type { SharePayload } from '@/lib/app/breaks/schema';

/**
 * The `Break` columns that are read off the document rather than the request.
 *
 * A saved pattern's list columns — style, meter, tempo, layer — are copies of
 * what is inside `doc`, kept so the list can filter and sort without decoding
 * every row. They are always derived here, never taken from the body, so a
 * client cannot save a row whose list entry says 4/4 funk at 94 and whose
 * document is something else. Create, bulk create and every PATCH that
 * replaces the document go through this one function; the earlier PATCH
 * derived its own copy and forgot `styleVersionId`, which is the drift one
 * function is for.
 */
export function columnsFromDoc(payload: SharePayload): {
  decoded: BreakDoc;
  columns: {
    style: string;
    styleVersionId: string | null;
    meter: string;
    bpm: number;
    swing: number;
    seed: bigint;
    bars: number;
    level: number;
  };
} {
  const decoded = breakDocFromPayload(payload);
  return {
    decoded,
    columns: {
      style: decoded.A.style,
      styleVersionId: decoded.A.styleVersionId,
      meter: decoded.A.meter,
      bpm: Math.round(decoded.bpm),
      swing: Math.round(decoded.swing),
      seed: BigInt(decoded.A.seed),
      bars: decoded.A.bars.length,
      level: decoded.level,
    },
  };
}
