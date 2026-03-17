import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";
import * as fs from 'fs';
import * as path from 'path';

// Inlined config for script stability
const firebaseConfig = {
    apiKey: "AIzaSyA6savTju84iknVG1tTkR9VsT_0Y7DzNaY",
    authDomain: "adaptivehealthengine.firebaseapp.com",
    projectId: "adaptivehealthengine",
    storageBucket: "adaptivehealthengine.firebasestorage.app",
    messagingSenderId: "1052524332554",
    appId: "1:1052524332554:web:58e085b0fdb6f1f592c1f3",
    measurementId: "G-S1128RMJEW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedFirebase() {
  const seedPath = '/Users/rbudigelli/RaynaVB/AdaptiveDecisionEngine/src/data/seed_ingredients.json';
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  
  const batchLimit = 500;
  let batch = writeBatch(db);
  let operationCount = 0;

  console.log('Starting Firebase Seed...');

  async function commitBatch() {
    if (operationCount > 0) {
      await batch.commit();
      console.log(`Committed ${operationCount} operations.`);
      batch = writeBatch(db);
      operationCount = 0;
    }
  }

  // 1. Seed Ingredients
  console.log(`Seeding ${data.ingredients.length} ingredients...`);
  for (const ing of data.ingredients) {
    const ref = doc(db, 'ingredients', ing.ingredient_id);
    batch.set(ref, ing);
    operationCount++;
    if (operationCount >= batchLimit) await commitBatch();
  }

  // 2. Seed Aliases
  console.log(`Seeding ${data.aliases.length} aliases...`);
  for (const alias of data.aliases) {
    const ref = doc(db, 'ingredient_aliases', alias.alias_id);
    batch.set(ref, alias);
    operationCount++;
    if (operationCount >= batchLimit) await commitBatch();
  }

  // 3. Seed Dish Priors
  console.log(`Seeding ${data.dishPriors.length} dish priors...`);
  for (const prior of data.dishPriors) {
    const ref = doc(db, 'dish_ingredient_priors', prior.dish_prior_id);
    batch.set(ref, prior);
    operationCount++;
    if (operationCount >= batchLimit) await commitBatch();
  }

  await commitBatch();
  console.log('Firebase Seeding Complete!');
}

seedFirebase().catch(err => {
  console.error('Seeding failed:', err);
});
