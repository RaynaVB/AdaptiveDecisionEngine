import { 
  Ingredient, 
  IngredientAlias, 
  DishIngredientPrior, 
  IngredientSystemData 
} from '../models/Ingredient';
import seedData from '../data/seed_ingredients.json';

export class IngredientService {
  private static instance: IngredientService;
  private data: IngredientSystemData;
  private aliasMap: Map<string, IngredientAlias>;
  private ingredientMap: Map<string, Ingredient>;

  private constructor() {
    this.data = seedData as unknown as IngredientSystemData;
    this.aliasMap = new Map();
    this.ingredientMap = new Map();
    this.initialize();
  }

  public static getInstance(): IngredientService {
    if (!IngredientService.instance) {
      IngredientService.instance = new IngredientService();
    }
    return IngredientService.instance;
  }

  private initialize() {
    // Index ingredients for fast lookup
    this.data.ingredients.forEach((ing: Ingredient) => {
      this.ingredientMap.set(ing.ingredient_id, ing);
    });

    // Index aliases (lowercase for normalized lookup)
    this.data.aliases.forEach((alias: IngredientAlias) => {
      this.aliasMap.set(alias.normalized_alias.toLowerCase(), alias);
    });
  }

  /**
   * Normalize text for alias lookup
   */
  public normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
      .replace(/\s{2,}/g, " "); // Collapse whitespace
  }

  /**
   * Resolve a raw text phrase to a canonical ingredient
   */
  public resolveIngredient(phrase: string): Ingredient | null {
    const normalized = this.normalize(phrase);
    
    // 1. Try exact alias match
    let alias = this.aliasMap.get(normalized);
    if (alias) {
      return this.ingredientMap.get(alias.ingredient_id) || null;
    }

    // 2. Try partial match fallback
    for (const [key, value] of this.aliasMap.entries()) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return this.ingredientMap.get(value.ingredient_id) || null;
      }
    }

    return null;
  }

  /**
   * Resolve multiple raw terms to canonical ingredients
   */
  public resolveIngredients(terms: string[]): Ingredient[] {
    const resolved: Ingredient[] = [];
    const seen = new Set<string>();

    terms.forEach(term => {
      const ing = this.resolveIngredient(term);
      if (ing && !seen.has(ing.ingredient_id)) {
        resolved.push(ing);
        seen.add(ing.ingredient_id);
      }
    });

    return resolved;
  }

  /**
   * Resolve a dish name to a canonical dish ID if possible
   */
  public resolveDish(dishName: string): { dishId: string; dishLabel: string } | null {
    const normalized = this.normalize(dishName);
    
    // Check priors for matching dish names
    const match = this.data.dishPriors.find(p => this.normalize(p.dish_name).includes(normalized) || normalized.includes(this.normalize(p.dish_name)));
    
    if (match) {
      return { dishId: match.dish_id, dishLabel: match.dish_name };
    }
    
    return null;
  }

  /**
   * Get all ingredients for a given dish ID
   */
  public getIngredientsForDish(dishId: string): Ingredient[] {
    const priors = this.data.dishPriors.filter((p: DishIngredientPrior) => p.dish_id === dishId);
    return priors
      .map((p: DishIngredientPrior) => this.ingredientMap.get(p.ingredient_id))
      .filter((ing: Ingredient | undefined): ing is Ingredient => !!ing);
  }

  /**
   * Get dish ingredient priors (raw data for specific use cases)
   */
  public getDishPriors(dishId: string): DishIngredientPrior[] {
    return this.data.dishPriors.filter((p: DishIngredientPrior) => p.dish_id === dishId);
  }

  /**
   * Search ingredients by name with simple local caching
   */
  private searchCache: Map<string, Ingredient[]> = new Map();

  public searchIngredients(query: string): Ingredient[] {
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery) return [];
    
    if (this.searchCache.has(normalizedQuery)) {
      return this.searchCache.get(normalizedQuery)!;
    }

    const results = this.data.ingredients.filter((ing: Ingredient) => 
      this.normalize(ing.canonical_name).includes(normalizedQuery) ||
      this.normalize(ing.display_name).includes(normalizedQuery)
    );
    
    this.searchCache.set(normalizedQuery, results);
    return results;
  }
}


export const ingredientService = IngredientService.getInstance();
