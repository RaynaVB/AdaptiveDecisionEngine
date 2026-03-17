import { IngredientService } from '../src/services/IngredientService';

describe('IngredientService', () => {
  let service: IngredientService;

  beforeEach(() => {
    service = IngredientService.getInstance();
  });

  test('should normalize text correctly', () => {
    expect(service.normalize('  Minced Garlic!  ')).toBe('minced garlic');
    expect(service.normalize('EXTRA VIRGIN olive oil...')).toBe('extra virgin olive oil');
  });

  test('should resolve exact aliases', () => {
    const garlic = service.resolveIngredient('minced garlic');
    expect(garlic).toBeDefined();
    expect(garlic?.ingredient_id).toBe('ing_garlic');

    const oil = service.resolveIngredient('extra virgin olive oil');
    expect(oil?.ingredient_id).toBe('ing_olive_oil');
  });

  test('should get ingredients for a dish', () => {
    const ingredients = service.getIngredientsForDish('dish_butter_chicken');
    expect(ingredients.length).toBeGreaterThan(0);
    expect(ingredients.map(i => i.ingredient_id)).toContain('ing_chicken');
    expect(ingredients.map(i => i.ingredient_id)).toContain('ing_tomato');
  });

  test('should search ingredients by name', () => {
    const results = service.searchIngredients('on');
    expect(results.length).toBeGreaterThan(0);
    expect(results.map(i => i.ingredient_id)).toContain('ing_onion');
  });

  test('should handle scale (simulation)', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
        service.resolveIngredient('minced garlic');
    }
    const end = Date.now();
    console.log(`Resolved 1000 items in ${end - start}ms`);
    expect(end - start).toBeLessThan(500);
  });
});
