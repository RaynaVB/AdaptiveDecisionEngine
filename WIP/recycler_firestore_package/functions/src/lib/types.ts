export type IngredientDoc = {
  ingredient_id: string;
  canonical_name: string;
  display_name: string;
  category: string;
  subcategory?: string | null;
  parent_id?: string | null;
  forms?: string[];
  flags?: {
    allergens?: string[];
    diet?: string[];
    symptom?: string[];
    traits?: string[];
  };
  source_summary?: {
    from_usda?: boolean;
    from_recipe?: boolean;
    from_off?: boolean;
  };
  search_terms?: string[];
  status: 'active' | 'inactive' | 'draft';
  created_at?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updated_at?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

export type AliasDoc = {
  alias: string;
  normalized_alias: string;
  ingredient_id: string;
  alias_type: 'exact' | 'normalized' | 'recipe_phrase' | 'packaged_label' | 'model_output';
  confidence: number;
  source: string;
  status: 'approved' | 'draft' | 'rejected';
  created_at?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updated_at?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

export type DishPriorDoc = {
  dish_id: string;
  dish_name: string;
  ingredient_id: string;
  prevalence_score: number;
  hidden_likelihood: number;
  visibility_score: number;
  cuisine?: string;
  evidence_source?: string[];
  created_at?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updated_at?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

export type ImportJobDoc = {
  job_type: string;
  source: string;
  status: 'queued' | 'running' | 'completed' | 'completed_with_errors' | 'failed';
  stats: {
    processed: number;
    inserted: number;
    updated: number;
    failed: number;
    unresolved: number;
  };
  options?: Record<string, unknown>;
  started_at?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  completed_at?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
  error_message?: string | null;
  schema_version?: number;
};
