export function normalizeIngredientPhrase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(?:[\/.]\d+)?\b/g, ' ')
    .replace(/\b(cup|cups|tbsp|tsp|teaspoon|teaspoons|tablespoon|tablespoons|oz|ounce|ounces|g|kg|ml|l|lb|lbs|pound|pounds)\b/g, ' ')
    .replace(/\b(chopped|minced|diced|fresh|organic|large|small|medium|boneless|skinless)\b/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stableAliasId(normalizedAlias: string, ingredientId: string): string {
  const aliasPart = normalizedAlias.replace(/\s+/g, '_').slice(0, 80);
  return `${aliasPart}__${ingredientId}`;
}

export function stableDishPriorId(dishId: string, ingredientId: string): string {
  return `${dishId}__${ingredientId}`;
}
