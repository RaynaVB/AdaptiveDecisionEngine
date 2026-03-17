import { FieldValue } from '../lib/firestore';
import { AliasDoc } from '../lib/types';
import { normalizeIngredientPhrase, stableAliasId } from '../lib/normalize';
import { createImportJob, completeImportJob, upsertInChunks } from './shared';

export async function importAliases(jobId: string, source: string, rows: AliasDoc[]) {
  const stats = { processed: 0, inserted: 0, updated: 0, failed: 0, unresolved: 0 };
  await createImportJob(jobId, 'alias_seed_import', source);

  try {
    const prepared = rows.map((row) => {
      if (!row.alias || !row.ingredient_id) {
        stats.failed += 1;
        return null;
      }
      const normalized = row.normalized_alias || normalizeIngredientPhrase(row.alias);
      stats.processed += 1;
      return {
        id: stableAliasId(normalized, row.ingredient_id),
        data: {
          ...row,
          normalized_alias: normalized,
          updated_at: FieldValue.serverTimestamp(),
          created_at: row.created_at ?? FieldValue.serverTimestamp(),
        },
      };
    }).filter(Boolean) as Array<{ id: string; data: AliasDoc }>;

    const result = await upsertInChunks('ingredient_aliases', prepared);
    stats.inserted += result.inserted;
    stats.updated += result.updated;
    await completeImportJob(jobId, stats.failed > 0 ? 'completed_with_errors' : 'completed', stats);
    return stats;
  } catch (error) {
    await completeImportJob(jobId, 'failed', stats, error instanceof Error ? error.message : 'unknown error');
    throw error;
  }
}
