import * as fs from 'fs';
import * as path from 'path';

const SEED_SOURCE_DIR = '/Users/rbudigelli/RaynaVB/AdaptiveDecisionEngine/docs/ingredients/seeds';
const OUTPUT_FILE = '/Users/rbudigelli/RaynaVB/AdaptiveDecisionEngine/src/data/seed_ingredients.json';

function parseCSV(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: any = {};
    headers.forEach((header, i) => {
      let value: any = values[i];
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (value === '') value = null;
      else if (!isNaN(Number(value)) && header.includes('score') || header.includes('confidence') || header.includes('likelihood')) {
        value = Number(value);
      }
      obj[header.trim()] = value;
    });
    return obj;
  });
}

function process() {
  console.log('Processing ingredient seeds...');
  
  const now = new Date().toISOString();

  const ingredients = parseCSV(path.join(SEED_SOURCE_DIR, 'ingredient_seed.csv')).map(ing => ({
    ...ing,
    created_at: now,
    updated_at: now
  }));

  const aliases = parseCSV(path.join(SEED_SOURCE_DIR, 'ingredient_aliases_seed.csv')).map((alias, i) => ({
    alias_id: `alias_${alias.ingredient_id.replace('ing_', '')}_${i}`,
    ...alias,
    created_at: now,
    updated_at: now
  }));

  const dishPriors = parseCSV(path.join(SEED_SOURCE_DIR, 'dish_ingredient_priors_seed.csv')).map((prior, i) => ({
    dish_prior_id: `prior_${prior.dish_id.replace('dish_', '')}_${prior.ingredient_id.replace('ing_', '')}`,
    ...prior,
    created_at: now,
    updated_at: now
  }));

  const result = {
    ingredients,
    aliases,
    relations: [], // relations CSV not provided in preview, but schema allows it
    flags: [], // flags are often separate or embedded, WIP preview showed them in INGREDIENT_SCHEMA.md
    dishPriors
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`Saved ${ingredients.length} ingredients, ${aliases.length} aliases, and ${dishPriors.length} dish priors to ${OUTPUT_FILE}`);
}

process();
