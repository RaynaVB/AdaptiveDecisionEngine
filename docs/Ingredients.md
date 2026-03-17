# Ingredient Source of Truth

## Goal
Build a canonical ingredient source of truth that is:
- **Clean enough** for analytics and symptom correlation
- **Broad enough** to cover real meals
- **Flexible enough** to absorb messy model output, recipe text, and packaged-food labels

> [!NOTE]
> The output is not “a giant raw database.” It is a curated **ingredient graph + alias system**.

## Source Roles

### 1) USDA / Public Food DB = Breadth Backbone
Use USDA as the starting backbone for common foods, commodity items, and standardized food naming. FoodData Central includes multiple data types and is meant for application developers, but it is much broader than what you want to expose directly in your app.

**Use it for:**
- Initial ingredient candidates
- Category seeding
- Nutrition linkage later
- Canonical naming inspiration

*Do not use it directly as your final user-facing ingredient taxonomy.*

### 2) Recipe Datasets = Practical Meal Intelligence
Use recipe datasets to learn which ingredients actually appear in dishes, how ingredients are phrased in recipe text, and which ingredient combinations are common. Recipe1M+ contains over one million recipes and millions of food images, and RecipeNLG expands recipe coverage with a large preprocessed recipe corpus.

**Use them for:**
- Ingredient frequency ranking
- Dish-to-ingredient priors
- Alias discovery from recipe phrasing
- Deciding what belongs in MVP

### 3) Open Food Facts = Alias Enrichment
Use Open Food Facts mainly for packaged-food ingredient language, ingredient taxonomies, and messy real-world labeling patterns. Their wiki documents ingredient extraction/analysis and ingredients taxonomies.

**Use it for:**
- Ingredient aliases
- Packaged-food ingredient variants
- Additive/preservative names
- Multilingual or consumer-label edge cases later

### 4) Your Curated Canonical Table = Source of Truth
This becomes the only thing the app trusts internally. Everything else maps into it.

---

## Final Target Data Model
You should end with 5 core entities:

### 1. Ingredients
One row per canonical ingredient.
- **Key fields:** `ingredient_id`, `canonical_name`, `display_name`, `category`, `subcategory`, `parent_id`, `is_hidden_common`, `is_packaged_additive`, `active`

### 2. Ingredient Aliases
Every messy phrase that maps to a canonical ingredient.
- **Key fields:** `alias`, `ingredient_id`, `alias_type` (exact, normalized, recipe_phrase, packaged_label, model_output), `confidence`

### 3. Ingredient Relations
For hierarchy and relatedness.
- **Key fields:** `parent_id`, `child_id`, `relation_type` (is_a, part_of, derived_from, often_with)

### 4. Ingredient Flags
Cross-cutting tags for symptoms and analytics.
- **Examples:** `dairy`, `gluten`, `soy`, `egg`, `tree_nut`, `peanut`, `sesame`, `shellfish`, `fodmap_high`, `spicy`, `fermented`, `artificial_sweetener`

### 5. Dish Ingredient Priors
This is what makes the meal-photo system useful.
- **Key fields:** `dish_id`, `ingredient_id`, `prevalence_score`, `hidden_likelihood`, `visibility_score`, `cuisine`, `evidence_source`

---

## Scope for MVP
Do not try to build the whole food universe first. Start with:
- **1,000–1,500** canonical ingredients
- **5,000–15,000** aliases
- **20–30** top-level/sub-level categories
- **200–500** common dishes with ingredient priors

*That is enough to cover most home meals, restaurant meals, and a meaningful packaged-food layer.*

---

## Phase Plan

### Phase 1 — Define the Canonical Schema
Before touching data, define the rules. You need written rules for:
- What counts as a canonical ingredient
- What becomes an alias
- When two items stay separate
- When variants collapse into one parent

**Rule of Thumb:** Keep separate if it differs meaningfully for symptoms, allergens, user meaning, nutrition behavior, or cooking role.
- **Separate:** Milk vs. Cream, Wheat flour vs. Almond flour, Onion vs. Garlic.
- **Collapse:** Red onion -> Onion, Roma tomato -> Tomato, Baby spinach -> Spinach.

**Deliverables:** Canonical spec, Alias policy, Hierarchy policy, Symptom-tag policy.

### Phase 2 — USDA Ingest for Breadth
Pull USDA data and extract candidate records relevant to ingredients.
- Ingest USDA
- Strip out branded/prepared noise for MVP
- Normalize names and dedupe by root concept
- Assign provisional categories

**Heuristic Filters:**
- **Keep:** Produce, meats, fish, grains, legumes, dairy basics, oils, herbs/spices, nuts/seeds, common sauces.
- **Skip initially:** Branded products, prepared entrees, serving-format duplicates, redundant records.

### Phase 3 — Recipe Ingest for Practical Coverage
Ingest a recipe dataset (Recipe1M+, RecipeNLG) to mine:
- Top ingredient phrases by frequency
- Ingredient co-occurrence
- Dish-to-ingredient relationships
- Phrase normalization patterns (e.g., "2 cloves garlic, minced" -> "garlic")

### Phase 4 — Open Food Facts for Alias Enrichment
Ingest OFF fields to widen your understanding of messy naming:
- Additive/Preservative names
- Alternate spellings
- Ingredient-label phrases
- Packaged-food ingredient variants

### Phase 5 — Curate the Canonical Table
Merge everything into your source of truth.
**Prioritization:**
1. Top-frequency recipe ingredients
2. High-value USDA basics
3. Open Food Facts alias coverage
4. **Manual review** of symptom-relevant ingredients (Dairy -> Gluten -> Alliums -> Legumes -> Nuts/Seeds -> Oils -> Spicy -> Sweeteners -> Additives -> Sauces).

### Phase 6 — Build Normalization and Mapping Rules
The engine that makes it usable:
`raw phrase -> normalize text -> exact alias lookup -> fuzzy/rule-based mapping -> fallback review`

**Normalization Steps:**
- Lowercase
- Remove quantities/prep words
- Singularize
- Standardize punctuation/whitespace
- Strip marketing descriptors

### Phase 7 — Add Symptom and Analytics Tags
Enrich ingredients with metadata:
- **Allergen flags** (Dairy, Gluten, Soy, etc.)
- **Dietary/Symptom flags** (High FODMAP, Spicy, Additive, Artificial Sweetener)

### Phase 8 — Build Dish Priors
Create `dish_ingredient_priors` once the list is stable.
- **Example:** Chicken Tikka Masala -> Chicken, Tomato, Cream, Onion, Garlic, Ginger, Oil, Garam Masala.
- Bridge photo recognition to likely ingredients.

---

## Recommended Team Workflow
- **Batch 1: Taxonomy first** — Define categories, split/merge rules, tag policy.
- **Batch 2: Ingestion** — USDA extraction, recipe parsing, OFF mining.
- **Batch 3: Curation** — Human-in-the-loop review of top concepts, aliases, and dishes.
- **Batch 4: App Integration** — Use table in photo analysis, logging, and symptom linking.

---

## Success Metrics
- **Coverage:** % of meal logs where >=80% of ingredients map to canonicals.
- **Alias Resolution:** % of raw phrases auto-resolved.
- **Precision:** % of auto-mapped aliases accepted.
- **Symptom Usefulness:** % of correlations tied to canonicals vs. free text.
- **Product UX:** Average user edits required after detection.

---

## What Not to Do
- [ ] Do not expose USDA raw items directly to users.
- [ ] Do not make every variant its own canonical ingredient.
- [ ] Do not let the model invent uncontrolled ingredient strings.
- [ ] Do not mix dishes and ingredients in the same table.
- [ ] Do not overfit to branded foods too early.

---

## Practical 6-Week Build
- **Week 1:** Schema, rules, categories, tags.
- **Week 2:** USDA ingest & candidates.
- **Week 3:** Recipe ingest & phrase parser.
- **Week 4:** OFF alias ingestion.
- **Week 5:** Curate top 1,500 ingredients & 5,000 aliases.
- **Week 6:** Normalization service + dish priors.

---

## First Concrete Deliverables
- `INGREDIENT_SCHEMA.md`
- `CATEGORY_TAXONOMY.md`
- `CANONICAL_RULES.md`
- `ingredient_seed.csv`
- `ingredient_aliases_seed.csv`
- `dish_ingredient_priors_seed.csv`
- `normalization_rules.yaml`