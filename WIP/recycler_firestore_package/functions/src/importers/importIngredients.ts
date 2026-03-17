import { FieldValue } from '../lib/firestore';
import { IngredientDoc } from '../lib/types';
import { createImportJob, completeImportJob, upsertInChunks } from './shared';

export async function importIngredients(jobId: string, source: string, rows: IngredientDoc[]) {
  const stats = { processed: 0, inserted: 0, updated: 0, failed: 0, unresolved: 0 };
  await createImportJob(jobId, 'ingredient_seed_import', source);

  try {
    const prepared = rows.map((row) => {
      if (!row.ingredient_id || !row.canonical_name || !row.display_name || !row.category) {
        stats.failed += 1;
        return null;
      }
      stats.processed += 1;
      return {
        id: row.ingredient_id,
        data: {
          ...row,
          updated_at: FieldValue.serverTimestamp(),
          created_at: row.created_at ?? FieldValue.serverTimestamp(),
        },
      };
    }).filter(Boolean) as Array<{ id: string; data: IngredientDoc }>;

    const result = await upsertInChunks('ingredients', prepared);
    stats.inserted += result.inserted;
    stats.updated += result.updated;
    await completeImportJob(jobId, stats.failed > 0 ? 'completed_with_errors' : 'completed', stats);
    return stats;
  } catch (error) {
    await completeImportJob(jobId, 'failed', stats, error instanceof Error ? error.message : 'unknown error');
    throw error;
  }
}
