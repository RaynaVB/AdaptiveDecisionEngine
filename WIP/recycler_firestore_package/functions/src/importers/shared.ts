import { db, FieldValue } from '../lib/firestore';
import { ImportJobDoc } from '../lib/types';

export async function createImportJob(jobId: string, jobType: string, source: string, options?: Record<string, unknown>) {
  const doc: ImportJobDoc = {
    job_type: jobType,
    source,
    status: 'running',
    stats: { processed: 0, inserted: 0, updated: 0, failed: 0, unresolved: 0 },
    options: options ?? {},
    started_at: FieldValue.serverTimestamp(),
    completed_at: null,
    error_message: null,
    schema_version: 1,
  };
  await db.collection('import_jobs').doc(jobId).set(doc, { merge: true });
}

export async function completeImportJob(jobId: string, status: ImportJobDoc['status'], stats: ImportJobDoc['stats'], errorMessage?: string | null) {
  await db.collection('import_jobs').doc(jobId).set({
    status,
    stats,
    error_message: errorMessage ?? null,
    completed_at: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function upsertInChunks<T extends Record<string, unknown>>(
  collectionName: string,
  rows: Array<{ id: string; data: T }>,
  chunkSize = 300,
) {
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const refs = chunk.map((r) => db.collection(collectionName).doc(r.id));
    const existingDocs = await db.getAll(...refs);

    const batch = db.batch();
    chunk.forEach((row, idx) => {
      const exists = existingDocs[idx]?.exists ?? false;
      if (exists) updated += 1;
      else inserted += 1;
      batch.set(refs[idx], row.data, { merge: true });
    });
    await batch.commit();
  }

  return { inserted, updated };
}
