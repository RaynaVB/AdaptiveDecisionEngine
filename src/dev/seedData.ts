import { v4 as uuidv4 } from 'uuid';
import { MealEvent, MoodEvent, MealSlot, ConfirmedIngredient } from '../models/types';
import { SymptomEvent } from '../models/Symptom';

// ---------------------------------------------------------------------------
// Mood scale:    -2 (very negative) → -1 → 0 (neutral) → +1 → +2 (very positive)
// Symptom scale: 1 (mild) → 2 (moderate) → 3 (severe)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Ingredient helpers
// ---------------------------------------------------------------------------
function ing(
  ingredientId: string,
  canonicalName: string,
  status: ConfirmedIngredient['confirmedStatus'] = 'confirmed',
  source: ConfirmedIngredient['source'] = 'visible',
  confidence = 0.95
): ConfirmedIngredient {
  return { ingredientId, canonicalName, confirmedStatus: status, source, confidence };
}

// ---------------------------------------------------------------------------
// Meal catalog
// ---------------------------------------------------------------------------
const BREAKFASTS: Array<{
  dishLabel: string;
  ingredients: ConfirmedIngredient[];
  hasDairy: boolean;
}> = [
  {
    dishLabel: 'Yogurt Parfait',
    hasDairy: true,
    ingredients: [
      ing('greek_yogurt', 'Greek Yogurt'),
      ing('granola', 'Granola'),
      ing('blueberry', 'Blueberry'),
      ing('honey', 'Honey'),
    ],
  },
  {
    dishLabel: 'Oatmeal with Berries',
    hasDairy: false,
    ingredients: [
      ing('oats', 'Rolled Oats'),
      ing('blueberry', 'Blueberry'),
      ing('almond_milk', 'Almond Milk'),
      ing('chia_seeds', 'Chia Seeds', 'suggested', 'inferred_dish_prior', 0.75),
    ],
  },
  {
    dishLabel: 'Avocado Toast with Egg',
    hasDairy: false,
    ingredients: [
      ing('whole_wheat_bread', 'Whole Wheat Bread'),
      ing('avocado', 'Avocado'),
      ing('egg', 'Egg'),
      ing('red_pepper_flakes', 'Red Pepper Flakes', 'suggested', 'inferred_dish_prior', 0.7),
    ],
  },
  {
    dishLabel: 'Cereal with Milk',
    hasDairy: true,
    ingredients: [
      ing('corn_flakes', 'Corn Flakes'),
      ing('whole_milk', 'Whole Milk'),
      ing('banana', 'Banana'),
    ],
  },
];

const LUNCHES: Array<{
  dishLabel: string;
  ingredients: ConfirmedIngredient[];
}> = [
  {
    dishLabel: 'Grilled Chicken Salad',
    ingredients: [
      ing('chicken_breast', 'Chicken Breast'),
      ing('romaine_lettuce', 'Romaine Lettuce'),
      ing('cucumber', 'Cucumber'),
      ing('cherry_tomato', 'Cherry Tomato'),
      ing('olive_oil', 'Olive Oil'),
    ],
  },
  {
    dishLabel: 'Quinoa Buddha Bowl',
    ingredients: [
      ing('quinoa', 'Quinoa'),
      ing('roasted_sweet_potato', 'Roasted Sweet Potato'),
      ing('chickpea', 'Chickpea'),
      ing('spinach', 'Spinach'),
      ing('tahini', 'Tahini'),
    ],
  },
  {
    dishLabel: 'Turkey Sandwich',
    ingredients: [
      ing('turkey_breast', 'Turkey Breast'),
      ing('whole_wheat_bread', 'Whole Wheat Bread'),
      ing('lettuce', 'Lettuce'),
      ing('tomato', 'Tomato'),
      ing('mustard', 'Mustard'),
    ],
  },
  {
    dishLabel: 'Lentil Soup',
    ingredients: [
      ing('red_lentil', 'Red Lentil'),
      ing('carrot', 'Carrot'),
      ing('onion', 'Onion'),
      ing('cumin', 'Cumin'),
      ing('vegetable_broth', 'Vegetable Broth'),
    ],
  },
];

const DINNERS: Array<{
  dishLabel: string;
  ingredients: ConfirmedIngredient[];
  hasGluten: boolean;
}> = [
  {
    dishLabel: 'Grilled Salmon with Asparagus',
    hasGluten: false,
    ingredients: [
      ing('salmon', 'Salmon'),
      ing('asparagus', 'Asparagus'),
      ing('lemon', 'Lemon'),
      ing('olive_oil', 'Olive Oil'),
      ing('garlic', 'Garlic'),
    ],
  },
  {
    dishLabel: 'Pasta Bolognese',
    hasGluten: true,
    ingredients: [
      ing('pasta', 'Pasta'),
      ing('ground_beef', 'Ground Beef'),
      ing('tomato_sauce', 'Tomato Sauce'),
      ing('parmesan', 'Parmesan', 'suggested', 'inferred_dish_prior', 0.85),
      ing('onion', 'Onion'),
    ],
  },
  {
    dishLabel: 'Veggie Stir Fry with Tofu',
    hasGluten: false,
    ingredients: [
      ing('tofu', 'Tofu'),
      ing('broccoli', 'Broccoli'),
      ing('bell_pepper', 'Bell Pepper'),
      ing('soy_sauce', 'Soy Sauce'),
      ing('ginger', 'Ginger'),
      ing('sesame_oil', 'Sesame Oil', 'suggested', 'inferred_dish_prior', 0.8),
    ],
  },
  {
    dishLabel: 'Chicken Tacos',
    hasGluten: false,
    ingredients: [
      ing('chicken_breast', 'Chicken Breast'),
      ing('corn_tortilla', 'Corn Tortilla'),
      ing('salsa', 'Salsa'),
      ing('avocado', 'Avocado'),
      ing('lime', 'Lime'),
      ing('cilantro', 'Cilantro', 'suggested', 'inferred_dish_prior', 0.7),
    ],
  },
];

const LATE_SNACKS: Array<{
  dishLabel: string;
  ingredients: ConfirmedIngredient[];
}> = [
  {
    dishLabel: 'Chips and Salsa',
    ingredients: [
      ing('potato_chips', 'Potato Chips'),
      ing('salsa', 'Salsa'),
    ],
  },
  {
    dishLabel: 'Chocolate Ice Cream',
    ingredients: [
      ing('chocolate_ice_cream', 'Chocolate Ice Cream'),
      ing('whole_milk', 'Whole Milk', 'suggested', 'inferred_dish_prior', 0.9),
    ],
  },
];

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------
export const generateSeedData = (): { meals: MealEvent[], moods: MoodEvent[], symptoms: SymptomEvent[] } => {
  const meals: MealEvent[] = [];
  const moods: MoodEvent[] = [];
  const symptoms: SymptomEvent[] = [];

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const NUM_DAYS = 14;

  for (let i = 0; i < NUM_DAYS; i++) {
    const date = new Date(now.getTime() - i * oneDay);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const breakfast = BREAKFASTS[i % BREAKFASTS.length];
    const lunch = LUNCHES[i % LUNCHES.length];
    const dinner = DINNERS[i % DINNERS.length];
    const lateSnack = LATE_SNACKS[i % LATE_SNACKS.length];

    // P2 & P3 bias: late-night snacks every other day (and more on weekends)
    const hasLateNight = (i % 2 === 0) || isWeekend;

    const mealSlots: Array<{ slot: MealSlot; hour: number; minute: number; def: any }> = [
      { slot: 'breakfast', hour: 8, minute: 15, def: breakfast },
      { slot: 'lunch', hour: 12, minute: 30, def: lunch },
      { slot: 'dinner', hour: 19, minute: 15, def: dinner },
    ];
    if (hasLateNight) {
      mealSlots.push({ slot: 'snack', hour: 22, minute: 30, def: lateSnack });
    }

    for (const { slot, hour, minute, def } of mealSlots) {
      const t = new Date(date);
      t.setHours(hour, minute, 0, 0);

      meals.push({
        id: uuidv4(),
        createdAt: t.toISOString(),
        occurredAt: t.toISOString(),
        mealSlot: slot,
        inputMode: 'text',
        dishLabel: def.dishLabel,
        confirmedIngredients: def.ingredients,
        textDescription: def.dishLabel,
        raw_text: def.dishLabel,
      });

      // P4 bias: late snack (e.g. Chocolate) → mood drops about 90 mins later
      if (slot === 'snack' && def.dishLabel.includes('Chocolate')) {
        const moodT = new Date(t.getTime() + 90 * 60 * 1000);
        moods.push({
          id: uuidv4(),
          createdAt: moodT.toISOString(),
          occurredAt: moodT.toISOString(),
          symptomType: 'mood',
          category: 'mood',
          severity: -1,
          isOngoing: false,
          source: 'manual',
          moodLabel: 'Low',
          notes: 'Felt flat and sluggish after late snack',
        });
      }
    }

    // P1 bias: high stress before dinner on odd days
    if (i % 2 !== 0) {
      const moodT = new Date(date);
      moodT.setHours(18, 0, 0, 0);
      moods.push({
        id: uuidv4(),
        createdAt: moodT.toISOString(),
        occurredAt: moodT.toISOString(),
        symptomType: 'mood',
        category: 'mood',
        severity: -2,
        isOngoing: false,
        source: 'manual',
        moodLabel: 'Anxious',
        notes: 'Work pressure, deadline stress',
      });
    } else {
      // Positive morning mood on even days
      const moodT = new Date(date);
      moodT.setHours(10, 0, 0, 0);
      moods.push({
        id: uuidv4(),
        createdAt: moodT.toISOString(),
        occurredAt: moodT.toISOString(),
        symptomType: 'mood',
        category: 'mood',
        severity: i % 4 === 0 ? 2 : 1,
        isOngoing: false,
        source: 'manual',
        moodLabel: i % 4 === 0 ? 'Great' : 'Good',
      });
    }

    // Symptoms... (ensuring dense correlations for testing triggers)
    if (breakfast.hasDairy) {
      // Every dairy breakfast results in bloating 2 hours later
      const symT = new Date(date);
      symT.setHours(10, 15, 0, 0);
      symptoms.push({
        id: uuidv4(),
        createdAt: symT.toISOString(),
        occurredAt: symT.toISOString(),
        symptomType: 'bloating',
        category: 'digestive',
        isOngoing: false,
        source: 'manual',
        severity: 2,
        durationMinutes: 45,
        notes: 'Stomach feels full and uncomfortable after dairy',
      });
    }

    if (dinner.hasGluten) {
      // Every gluten dinner results in headache
      const symT = new Date(date);
      symT.setHours(23, 30, 0, 0);
      symptoms.push({
        id: uuidv4(),
        createdAt: symT.toISOString(),
        occurredAt: symT.toISOString(),
        symptomType: 'headaches', // Match backend pluralization if needed
        category: 'neurological',
        isOngoing: false,
        source: 'manual',
        severity: 1,
        durationMinutes: 60,
        notes: 'Dull headache after dinner',
      });
    }

    // Every chocolate snack leads to a fatigue or energy drop
    if (lateSnack.dishLabel.includes('Chocolate')) {
      const symT = new Date(date);
      symT.setHours(23, 50, 0, 0);
      symptoms.push({
        id: uuidv4(),
        createdAt: symT.toISOString(),
        occurredAt: symT.toISOString(),
        symptomType: 'fatigue',
        category: 'energy',
        isOngoing: false,
        source: 'manual',
        severity: 2,
        durationMinutes: 120,
        notes: 'Sugar crash after chocolate snack',
      });
    }
  }

  meals.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  moods.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  symptoms.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return { meals, moods, symptoms };
};
