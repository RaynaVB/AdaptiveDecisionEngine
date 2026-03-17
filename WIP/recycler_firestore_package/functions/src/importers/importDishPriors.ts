import { FieldValue } from '../lib/firestore';
import { DishPriorDoc } from '../lib/types';
import { stableDishPriorId } from '../lib/normalize';
import { createImportJob, completeImportJob, upsertInChunks } from './shared';

export async function importDishPriors(jobId: string, source: string, rows: DishPriorDoc[]) {
  const stats = { processed: 0, inserted: 0, updated: 0, failed: 0, unresolved: 0 };
  await createImportJob(jobId, 'dish_prior_import', source);

  try {
    const prepared = rows.map((row) => {
      if (!row.dish_id || !row.dish_name || !row.ingredient_id) {
        stats.failed += 1;
        return null;
      }
      stats.processed += 1;
      return {
        id: stableDishPriorId(row.dish_id, row.ingredient_id),
        data: {
          ...row,
          updated_at: FieldValue.serverTimestamp(),
          created_at: row.created_at ?? FieldValue.serverTimestamp(),
        },
      };
    }).filter(Boolean) as Array<{ id: string; data: DishPriorDoc }>;

    const result = await upsertInChunks('dish_ingredient_priors', prepared);
    stats.inserted += result.inserted;
    stats.updated += result.updated;
    await completeImportJob(jobId, stats.failed > 0 ? 'completed_with_errors' : 'completed', stats);
    return stats;
  } catch (error) {
    await completeImportJob(jobId, 'failed', stats, error instanceof Error ? error.message : 'unknown error');
    throw error;
  }
}
