# Recycler Ingredient Implementation Package

This package contains the first production-ready planning artifacts for the canonical ingredient system.

## Files

- `INGREDIENT_SCHEMA.md`
- `CATEGORY_TAXONOMY.md`
- `CANONICAL_RULES.md`
- `ingredient_seed.csv`
- `ingredient_aliases_seed.csv`
- `dish_ingredient_priors_seed.csv`
- `normalization_rules.yaml`

## Suggested build order

1. Create Firestore collections/tables from `INGREDIENT_SCHEMA.md`
2. Load `ingredient_seed.csv`
3. Load `ingredient_aliases_seed.csv`
4. Implement normalization pipeline from `normalization_rules.yaml`
5. Add unresolved-phrase review queue
6. Load `dish_ingredient_priors_seed.csv`
7. Expand with USDA, recipe, and Open Food Facts pipelines
