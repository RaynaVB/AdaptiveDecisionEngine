# Security and Ops

## Recommended protections
- Keep import endpoints admin-only.
- Require Firebase Auth custom claims such as `taxonomyAdmin: true`.
- Prefer Cloud Storage signed uploads or trusted back-office tooling for large files.

## Firestore security rules
- End users should have read-only access to public canonical data if needed.
- End users should never write canonical taxonomy collections directly.
- Admin tools may write through trusted backend only.

## Operational notes
- Add structured logs for every import job.
- Emit counts: processed, inserted, updated, unresolved, failed.
- Consider a daily unresolved-phrase report.
- Snapshot/export Firestore before major taxonomy migrations.

## Versioning
Add `schema_version` where useful, especially on import jobs and normalization rules.
