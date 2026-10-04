'use client';

import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { type PieceView, pieceListSchema } from '@/lib/app/breaks/kit-builder';
import { logger } from '@/lib/logging';

/**
 * The pieces a kit of yours may be built from (9.18), fetched when the builder
 * first shows. The Studio pages do not carry them, so a visit that never opens
 * the builder never reads them. `null` while they load; empty if they would
 * not, and the builder says so.
 */
export function useKitPieces(): { pieces: PieceView[] | null; failed: boolean } {
  const [pieces, setPieces] = useState<PieceView[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    apiClient
      .get('/api/v1/catalogue/pieces')
      .then((data) => {
        if (live) setPieces(pieceListSchema.parse(data));
      })
      .catch((error: unknown) => {
        logger.warn('Kit pieces did not load', {
          error: error instanceof Error ? error.message : error,
        });
        if (!live) return;
        setPieces([]);
        setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);

  return { pieces, failed };
}
