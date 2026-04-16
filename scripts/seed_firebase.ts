import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Use serviceAccountKey.json if it exists, otherwise use ADC
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
const options: any = {
    projectId: "adaptivehealthengine"
};

if (fs.existsSync(serviceAccountPath)) {
    console.log('Using serviceAccountKey.json for authentication...');
    options.credential = cert(serviceAccountPath);
} else {
    console.log('No serviceAccountKey.json found. Attempting Application Default Credentials...');
}

if (getApps().length === 0) {
    initializeApp(options);
}

const db = getFirestore();

async function seedFirebase() {
  const seedPath = '/Users/rbudigelli/RaynaVB/AdaptiveDecisionEngine/src/data/seed_ingredients.json';
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  
  const batchLimit = 500;
  let batch = db.batch();
  let operationCount = 0;

  console.log('Starting Firebase Seed with Admin SDK...');

  async function commitBatch() {
    if (operationCount > 0) {
      await batch.commit();
      console.log(`Committed ${operationCount} operations.`);
      batch = db.batch();
      operationCount = 0;
    }
  }

  // 1. Seed Ingredients
  console.log(`Seeding ${data.ingredients.length} ingredients...`);
  for (const ing of data.ingredients) {
    const ref = db.collection('ingredients').doc(ing.ingredient_id);
    batch.set(ref, ing);
    operationCount++;
    if (operationCount >= batchLimit) await commitBatch();
  }

  // 2. Seed Aliases
  console.log(`Seeding ${data.aliases.length} aliases...`);
  for (const alias of data.aliases) {
    const ref = db.collection('ingredient_aliases').doc(alias.alias_id);
    batch.set(ref, alias);
    operationCount++;
    if (operationCount >= batchLimit) await commitBatch();
  }

  // 3. Seed Dish Priors
  console.log(`Seeding ${data.dishPriors.length} dish priors...`);
  for (const prior of data.dishPriors) {
    const ref = db.collection('dish_ingredient_priors').doc(prior.dish_prior_id);
    batch.set(ref, prior);
    operationCount++;
    if (operationCount >= batchLimit) await commitBatch();
  }

  await commitBatch();
  console.log('Firebase Seeding Complete!');
}

seedFirebase().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
