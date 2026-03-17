# Ingredient System Schema

This document formalizes the data models for the Ingredient Source of Truth, supporting a scale of ~1,500 canonical ingredients and ~15,000 aliases.

## 1. Ingredients
One row per canonical ingredient.
- `id`: string (uuid or slug, e.g., "garlic")
- `canonical_name`: string (e.g., "Garlic")
- `display_name`: string (e.g., "Garlic")
- `category`: string (e.g., "Vegetables")
- `subcategory`: string (optional, e.g., "Alliums")
- `parent_id`: string (optional, recursive link to parent `id`)
- `is_hidden_common`: boolean (true for things like water, salt)
- `is_packaged_additive`: boolean (true for preservatives)
- `active`: boolean

## 2. Ingredient Aliases
Mapping messy phrases to canonical ingredients.
- `alias`: string (unique key for lookup, e.g., "minced garlic")
- `ingredient_id`: string (foreign key to `Ingredients.id`)
- `alias_type`: enum (`exact`, `normalized`, `recipe_phrase`, `packaged_label`, `model_output`)
- `confidence`: float (0.0 to 1.0)

## 3. Ingredient Relations
Hierarchy and relatedness beyond simple parent/child.
- `id`: string (uuid)
- `parent_id`: string (source `id`)
- `child_id`: string (target `id`)
- `relation_type`: enum (`is_a`, `part_of`, `derived_from`, `often_with`)

## 4. Ingredient Flags
Metadata for symptoms and analytics. 
- `ingredient_id`: string
- `flag`: string (e.g., `dairy`, `gluten`, `high_fodmap`, `spicy`)
- `value`: boolean | string | number

## 5. Dish Ingredient Priors
Mapping dishes to their likely ingredients.
- `dish_id`: string (e.g., "chicken_caesar_salad")
- `ingredient_id`: string
- `prevalence_score`: float (probability this ingredient is in the dish, 0-1)
- `hidden_likelihood`: float (probability it's hidden/unseen)
- `visibility_score`: float (0-1, how visible it typically is for vision models)
- `cuisine`: string
- `evidence_source`: string (e.g., "Recipe1M", "manual_curation")

## Performance Considerations for Scale
- **Lookup**: Aliases should be indexed for O(1) or O(log N) lookup.
- **Normalization**: Raw text must be normalized before alias lookup to reduce alias count (e.g., "Garlic!!!!" -> "garlic").
- **Graph Coverage**: Relations and Flags should be stored in a way that allows fast traversal (e.g., "Find all ingredients with the 'dairy' flag").
