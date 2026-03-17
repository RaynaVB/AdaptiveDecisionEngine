# Recycler Firestore + Import Pipeline Package

This package turns the canonical ingredient implementation into a concrete Firebase design.

## Included
- `FIRESTORE_DATA_MODEL.md` — collection design and document shapes
- `IMPORT_PIPELINE.md` — end-to-end ingest and curation flow
- `SECURITY_AND_OPS.md` — operational notes
- `firestore.indexes.json` — suggested composite indexes
- `functions/` — sample Firebase Functions + Admin import pipeline in TypeScript
- `examples/` — sample JSON payloads for imports

## Recommended collections
- `ingredients`
- `ingredient_aliases`
- `ingredient_relations`
- `dish_ingredient_priors`
- `import_jobs`
- `normalization_rules`
- `unresolved_ingredient_phrases`

## Import flow
1. Upload seed CSV/JSON to Cloud Storage or call the HTTPS endpoint with JSON.
2. Create an `import_jobs/{jobId}` document.
3. Normalize source records into staging payloads.
4. Upsert canonical collections in batched writes.
5. Record unresolved phrases for human review.
6. Mark the job `completed` with counts.

## Notes
- This package assumes Firebase Functions v2 and Firestore in Native mode.
- The code uses batched upserts and deterministic document IDs where practical.
- The design separates canonical truth from raw source rows.
