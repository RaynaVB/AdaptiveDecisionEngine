import { onRequest } from 'firebase-functions/v2/https';
import { importIngredients } from './importers/importIngredients';
import { importAliases } from './importers/importAliases';
import { importDishPriors } from './importers/importDishPriors';

function assertAdmin(req: any) {
  // Replace with real auth checks. Example: verify Firebase Auth token and custom claim.
  const adminKey = req.get('x-admin-key');
  if (!adminKey || adminKey !== process.env.TAXONOMY_ADMIN_KEY) {
    throw new Error('unauthorized');
  }
}

export const importTaxonomy = onRequest({ cors: true, timeoutSeconds: 540, memory: '1GiB' }, async (req, res) => {
  try {
    assertAdmin(req);
    const { entityType, jobId, source, rows } = req.body ?? {};

    if (!entityType || !jobId || !source || !Array.isArray(rows)) {
      res.status(400).json({ error: 'entityType, jobId, source, and rows[] are required' });
      return;
    }

    let stats;
    if (entityType === 'ingredients') {
      stats = await importIngredients(jobId, source, rows);
    } else if (entityType === 'aliases') {
      stats = await importAliases(jobId, source, rows);
    } else if (entityType === 'dish_priors') {
      stats = await importDishPriors(jobId, source, rows);
    } else {
      res.status(400).json({ error: 'unsupported entityType' });
      return;
    }

    res.status(200).json({ ok: true, entityType, jobId, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    const status = message === 'unauthorized' ? 401 : 500;
    res.status(status).json({ ok: false, error: message });
  }
});
