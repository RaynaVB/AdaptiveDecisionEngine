# Firestore Data Model

## Design principles
- Canonical truth lives in a small set of normalized collections.
- Raw external source data should not be user-facing.
- User-facing meal inference should read mostly from canonical collections and precomputed priors.
- High-churn ingestion metadata stays separate from canonical data.

---

## 1) `ingredients/{ingredientId}`
Canonical source of truth for ingredients.

### Example document
```json
{
  "ingredient_id": "ing_onion",
  "canonical_name": "onion",
  "display_name": "Onion",
  "category": "vegetables",
  "subcategory": "alliums",
  "parent_id": null,
  "forms": ["raw", "cooked", "powder"],
  "flags": {
    "allergens": [],
    "diet": ["vegan", "vegetarian"],
    "symptom": ["fodmap_high"],
    "traits": ["hidden_common"]
  },
  "source_summary": {
    "from_usda": true,
    "from_recipe": true,
    "from_off": false
  },
  "search_terms": ["onion", "yellow onion", "red onion", "white onion"],
  "status": "active",
  "created_at": "<timestamp>",
  "updated_at": "<timestamp>"
}
```

### Required fields
- `ingredient_id`
- `canonical_name`
- `display_name`
- `category`
- `status`
- `created_at`
- `updated_at`

### Suggested document ID
Use `ingredient_id` directly, such as `ing_onion`.

---

## 2) `ingredient_aliases/{aliasId}`
Maps messy phrases to canonical ingredient IDs.

### Example document
```json
{
  "alias": "garbanzo beans",
  "normalized_alias": "garbanzo beans",
  "ingredient_id": "ing_chickpeas",
  "alias_type": "exact",
  "confidence": 0.99,
  "source": "manual",
  "status": "approved",
  "created_at": "<timestamp>",
  "updated_at": "<timestamp>"
}
```

### Suggested document ID
Use a stable hash of `normalized_alias + ingredient_id`, or a slug such as `garbanzo_beans__ing_chickpeas`.

### Required indexes
- `normalized_alias` ascending
- `ingredient_id` ascending
- `status` ascending + `normalized_alias` ascending

---

## 3) `ingredient_relations/{relationId}`
Stores hierarchy and relatedness.

### Example document
```json
{
  "parent_id": "ing_cheese",
  "child_id": "ing_mozzarella",
  "relation_type": "is_a",
  "strength": 1,
  "source": "manual",
  "created_at": "<timestamp>",
  "updated_at": "<timestamp>"
}
```

---

## 4) `dish_ingredient_priors/{priorId}`
Links dishes to likely ingredients.

### Example document
```json
{
  "dish_id": "dish_butter_chicken",
  "dish_name": "butter chicken",
  "ingredient_id": "ing_cream",
  "prevalence_score": 0.78,
  "hidden_likelihood": 0.95,
  "visibility_score": 0.15,
  "cuisine": "indian",
  "evidence_source": ["recipe_corpus", "manual_review"],
  "created_at": "<timestamp>",
  "updated_at": "<timestamp>"
}
```

### Suggested document ID
`dish_butter_chicken__ing_cream`

### Required indexes
- `dish_id` ascending + `prevalence_score` descending
- `dish_name` ascending + `prevalence_score` descending
- `ingredient_id` ascending

---

## 5) `normalization_rules/{ruleId}`
Declarative rules used by the parser.

### Example document
```json
{
  "name": "remove_quantities",
  "stage": 10,
  "rule_type": "regex_replace",
  "pattern": "\\b\\d+(?:[\\/\\.]\\d+)?\\s*(cup|cups|tbsp|tsp|oz|ounce|ounces|g|kg|ml|l)\\b",
  "replacement": "",
  "enabled": true,
  "created_at": "<timestamp>",
  "updated_at": "<timestamp>"
}
```

---

## 6) `unresolved_ingredient_phrases/{phraseId}`
Queue for phrases that failed canonical mapping.

### Example document
```json
{
  "raw_phrase": "house seasoning blend",
  "normalized_phrase": "house seasoning blend",
  "source_type": "recipe_phrase",
  "source_ref": {
    "dataset": "recipe1m",
    "record_id": "abc123"
  },
  "candidate_matches": [],
  "status": "open",
  "seen_count": 14,
  "last_seen_at": "<timestamp>",
  "created_at": "<timestamp>"
}
```

### Required indexes
- `status` ascending + `seen_count` descending
- `normalized_phrase` ascending

---

## 7) `import_jobs/{jobId}`
Tracks ingestion runs.

### Example document
```json
{
  "job_type": "ingredient_seed_import",
  "source": "csv_upload",
  "status": "running",
  "stats": {
    "processed": 124,
    "inserted": 101,
    "updated": 17,
    "failed": 6,
    "unresolved": 11
  },
  "options": {
    "dry_run": false,
    "upsert": true
  },
  "started_at": "<timestamp>",
  "completed_at": null,
  "error_message": null
}
```

---

## Access patterns

### Photo meal inference
Read:
- `ingredients`
- `ingredient_aliases`
- `dish_ingredient_priors`
- optionally `normalization_rules`

### Curation UI
Read/write:
- `unresolved_ingredient_phrases`
- `ingredient_aliases`
- `ingredients`
- `import_jobs`

### Admin imports
Write:
- all canonical collections
- `import_jobs`
- `unresolved_ingredient_phrases`

---

## Shaping guidance
- Keep documents narrow and queryable.
- Avoid embedding huge alias arrays inside `ingredients`; keep aliases as a separate collection for direct lookup.
- Duplicate tiny amounts of search-friendly text if it reduces query hops.
- Keep derived counters inside `import_jobs` or separate aggregate docs, not inside every ingredient.
