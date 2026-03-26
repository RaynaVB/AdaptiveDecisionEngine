import { v4 as uuidv4 } from 'uuid';
import { MealEvent, MoodEvent, MealSlot, MealTypeTag, ConfirmedIngredient } from '../models/types';
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
  tags: MealTypeTag[];
  ingredients: ConfirmedIngredient[];
  hasDairy: boolean;
}> = [
  {
    dishLabel: 'Yogurt Parfait',
    tags: ['light', 'homemade', 'high_protein'],
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
    tags: ['light', 'homemade', 'high_fiber'],
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
    tags: ['regular', 'homemade', 'high_protein'],
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
    tags: ['light', 'packaged', 'high_sugar'],
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
  tags: MealTypeTag[];
  ingredients: ConfirmedIngredient[];
}> = [
  {
    dishLabel: 'Grilled Chicken Salad',
    tags: ['regular', 'savory', 'high_protein'],
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
    tags: ['regular', 'homemade', 'high_fiber'],
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
    tags: ['regular', 'savory'],
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
    tags: ['regular', 'homemade', 'high_fiber'],
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
  tags: MealTypeTag[];
  ingredients: ConfirmedIngredient[];
  hasGluten: boolean;
}> = [
  {
    dishLabel: 'Grilled Salmon with Asparagus',
    tags: ['regular', 'homemade', 'high_protein'],
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
    tags: ['heavy', 'savory', 'restaurant'],
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
    tags: ['regular', 'homemade', 'high_protein'],
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
    tags: ['heavy', 'savory', 'restaurant'],
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
  tags: MealTypeTag[];
  ingredients: ConfirmedIngredient[];
}> = [
  {
    dishLabel: 'Chips and Salsa',
    tags: ['high_sugar', 'sweet', 'packaged'],
    ingredients: [
      ing('potato_chips', 'Potato Chips'),
      ing('salsa', 'Salsa'),
    ],
  },
  {
    dishLabel: 'Chocolate Ice Cream',
    tags: ['sweet', 'high_sugar', 'packaged'],
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

    const mealSlots: Array<{ slot: MealSlot; hour: number; minute: number; def: (typeof BREAKFASTS)[0] | (typeof DINNERS)[0] }> = [
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
        mealTypeTags: def.tags,
        tags: def.tags,
        confirmedIngredients: def.ingredients,
        textDescription: def.dishLabel,
        raw_text: def.dishLabel,
        portionSize: slot === 'dinner' ? 'large' : slot === 'snack' ? 'medium' : 'medium',
      });

      // P4 bias: high_sugar late snack → mood drops to -1 or -2 about 90 mins later
      if (def.tags.includes('high_sugar') && slot === 'snack') {
        const moodT = new Date(t.getTime() + 90 * 60 * 1000);
        moods.push({
          id: uuidv4(),
          createdAt: moodT.toISOString(),
          occurredAt: moodT.toISOString(),
          valence: -1,           // -2 to +2 scale: mild-to-moderate negative
          arousal: -1,
          moodLabel: 'Low',
          stress: 'low',
          energy: 'low',
          tag: 'sad',
          notes: 'Felt flat and sluggish after late snack',
        });
      }
    }

    // P1 bias: high stress (mood -1 to -2) before dinner on odd days
    if (i % 2 !== 0) {
      const moodT = new Date(date);
      moodT.setHours(18, 0, 0, 0);
      moods.push({
        id: uuidv4(),
        createdAt: moodT.toISOString(),
        occurredAt: moodT.toISOString(),
        valence: -2,             // -2 = most negative; strong stress signal for P1
        arousal: 2,
        moodLabel: 'Anxious',
        stress: 'high',
        energy: 'low',
        tag: 'anxious',
        notes: 'Work pressure, deadline stress',
      });
    } else {
      // Positive morning mood on even days — valence +1 or +2
      const moodT = new Date(date);
      moodT.setHours(10, 0, 0, 0);
      moods.push({
        id: uuidv4(),
        createdAt: moodT.toISOString(),
        occurredAt: moodT.toISOString(),
        valence: i % 4 === 0 ? 2 : 1,   // alternate +2 and +1
        arousal: 1,
        moodLabel: i % 4 === 0 ? 'Great' : 'Good',
        stress: 'low',
        energy: 'high',
        tag: 'celebratory',
      });
    }

    // P5 bias: dairy breakfast → bloating 2h later (severity 2 = moderate on 1-3 scale)
    if (breakfast.hasDairy) {
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
        severity: 2,             // 1-3 scale: 2 = moderate
        durationMinutes: 45,
        notes: 'Stomach feels full and uncomfortable after breakfast',
      });
    }

    // P7 bias (delayed trigger): gluten dinner → headache 8-10h later, severity 1-2
    if ((dinner as typeof DINNERS[0]).hasGluten && i % 3 === 0) {
      const symT = new Date(date);
      symT.setHours(23, 30, 0, 0);
      symptoms.push({
        id: uuidv4(),
        createdAt: symT.toISOString(),
        occurredAt: symT.toISOString(),
        symptomType: 'headache',
        category: 'neurological',
        isOngoing: false,
        source: 'manual',
        severity: 1,             // 1-3 scale: 1 = mild
        durationMinutes: 60,
        notes: 'Dull headache later in the evening',
      });
    }

    // Extra symptom variety: low energy on high-stress afternoons (severity 1)
    if (i % 2 !== 0) {
      const symT = new Date(date);
      symT.setHours(15, 30, 0, 0);
      symptoms.push({
        id: uuidv4(),
        createdAt: symT.toISOString(),
        occurredAt: symT.toISOString(),
        symptomType: 'fatigue',
        category: 'energy',
        isOngoing: false,
        source: 'manual',
        severity: 1,             // 1-3 scale: 1 = mild
        durationMinutes: 90,
        notes: 'Afternoon energy crash',
      });
    }
  }

  meals.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  moods.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  symptoms.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return { meals, moods, symptoms };
};
