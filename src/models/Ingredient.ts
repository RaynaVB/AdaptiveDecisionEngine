export type AliasType = 'exact' | 'normalized' | 'recipe_phrase' | 'packaged_label' | 'model_output' | 'synonym';
export type RelationType = 'is_a' | 'derived_from' | 'often_with';
export type SourceSystem = 'manual' | 'usda' | 'recipe' | 'openfoodfacts' | 'model_feedback';
export type ReviewStatus = 'draft' | 'reviewed' | 'approved' | 'deprecated';

export interface Ingredient {
  ingredient_id: string; // e.g. "ing_garlic"
  canonical_name: string;
  display_name: string;
  category: string;
  subcategory?: string;
  parent_id?: string | null;
  description?: string;
  hidden_common: boolean;
  packaged_additive: boolean;
  active: boolean;
  review_status: ReviewStatus;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface IngredientAlias {
  alias_id: string; // e.g. "alias_garlic_123"
  alias: string;
  normalized_alias: string;
  ingredient_id: string;
  alias_type: AliasType;
  source_system: SourceSystem;
  confidence: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IngredientFlags {
  ingredient_id: string;
  allergen_flags?: string[];
  diet_flags?: string[];
  sensitivity_flags?: string[];
  symptom_tags?: string[];
  common_forms?: string[];
}

export interface IngredientRelation {
  relation_id: string;
  parent_id: string;
  child_id: string;
  relation_type: RelationType;
  confidence: number;
  source_system: string;
}

export interface DishIngredientPrior {
  dish_prior_id: string;
  dish_id: string;
  dish_name: string;
  cuisine?: string;
  ingredient_id: string;
  prevalence_score: number;
  hidden_likelihood: number;
  visibility_score: number;
  evidence_source: string;
  review_status: ReviewStatus;
}

export interface IngredientSystemData {
  ingredients: Ingredient[];
  aliases: IngredientAlias[];
  relations: IngredientRelation[];
  flags: IngredientFlags[];
  dishPriors: DishIngredientPrior[];
}
