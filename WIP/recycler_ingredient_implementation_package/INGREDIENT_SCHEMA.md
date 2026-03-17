# INGREDIENT_SCHEMA.md

## Purpose

This schema defines the canonical ingredient system for Recycler. It is the single source of truth for:
- meal ingredient extraction
- alias normalization
- dish-to-ingredient inference
- symptom correlation
- analytics

External sources such as USDA, recipe datasets, and Open Food Facts are inputs only.

## Core tables

### `ingredients`
| Column | Type | Required | Description |
|---|---|---:|---|
| ingredient_id | string | yes | Stable ID, e.g. `ing_onion` |
| canonical_name | string | yes | Normalized internal name |
| display_name | string | yes | User-facing label |
| category | string | yes | Top-level grouping |
| subcategory | string | yes | More specific grouping |
| parent_id | string/null | no | Parent ingredient if applicable |
| description | string | no | Short editor note |
| hidden_common | boolean | yes | Often present but not visually obvious |
| packaged_additive | boolean | yes | Common in packaged foods/additives |
| active | boolean | yes | Whether ingredient is valid for production use |
| review_status | enum | yes | `draft`, `reviewed`, `approved`, `deprecated` |
| created_at | timestamp | yes | Creation time |
| updated_at | timestamp | yes | Last update time |

### `ingredient_aliases`
| Column | Type | Required | Description |
|---|---|---:|---|
| alias_id | string | yes | Stable ID |
| alias | string | yes | Raw alias string |
| normalized_alias | string | yes | Text-normalized form |
| ingredient_id | string | yes | Canonical target |
| alias_type | enum | yes | `exact`, `normalized`, `recipe_phrase`, `packaged_label`, `model_output`, `synonym` |
| source_system | enum | yes | `manual`, `usda`, `recipe`, `openfoodfacts`, `model_feedback` |
| confidence | float | yes | 0.0-1.0 confidence |
| active | boolean | yes | Whether alias should be used |
| created_at | timestamp | yes | Creation time |
| updated_at | timestamp | yes | Last update time |

### `ingredient_flags`
| Column | Type | Required | Description |
|---|---|---:|---|
| ingredient_id | string | yes | Canonical ingredient |
| allergen_flags | string[] | no | e.g. `dairy`, `tree_nut`, `soy` |
| diet_flags | string[] | no | e.g. `vegan`, `vegetarian` |
| sensitivity_flags | string[] | no | e.g. `fodmap_high`, `spicy`, `fermented` |
| symptom_tags | string[] | no | e.g. `bloating`, `reflux`, `gas` |
| common_forms | string[] | no | e.g. `fresh`, `powder`, `roasted` |

### `ingredient_relations`
| Column | Type | Required | Description |
|---|---|---:|---|
| relation_id | string | yes | Stable ID |
| parent_id | string | yes | Parent ingredient |
| child_id | string | yes | Child ingredient |
| relation_type | enum | yes | `is_a`, `derived_from`, `often_with` |
| confidence | float | yes | 0.0-1.0 confidence |
| source_system | string | yes | Where relation came from |

### `dish_ingredient_priors`
| Column | Type | Required | Description |
|---|---|---:|---|
| dish_prior_id | string | yes | Stable ID |
| dish_id | string | yes | Dish identifier |
| dish_name | string | yes | Human-readable dish |
| cuisine | string | no | Cuisine tag |
| ingredient_id | string | yes | Canonical ingredient |
| prevalence_score | float | yes | Likelihood ingredient appears in dish |
| hidden_likelihood | float | yes | How likely ingredient is present but not visible |
| visibility_score | float | yes | How visually obvious it tends to be |
| evidence_source | string | yes | `recipe_mining`, `manual`, `hybrid` |
| review_status | enum | yes | `draft`, `reviewed`, `approved` |

## ID conventions
- Ingredient IDs: `ing_<slug>`
- Alias IDs: `alias_<slug>_<hash>`
- Relation IDs: `rel_<parent>_<child>_<type>`
- Dish IDs: `dish_<slug>`
- Dish prior IDs: `prior_<dish>_<ingredient>`

## Canonical ingredient rules
Create a separate canonical ingredient when one or more is true:
- changes allergy behavior
- changes likely symptom behavior
- changes user interpretation materially
- changes cooking role materially
- changes nutrition profile materially

Examples that stay separate:
- milk / cream / yogurt / butter / cheese
- wheat flour / almond flour / oat flour
- onion / garlic
- soy sauce / miso
- chickpeas / lentils

Examples that usually collapse:
- red onion / yellow onion -> onion
- roma tomato / vine tomato -> tomato
- baby spinach -> spinach

## Alias resolution order
1. exact alias match
2. normalized alias match
3. synonym match
4. rule-based mapping
5. fuzzy candidate ranking
6. unresolved review queue
