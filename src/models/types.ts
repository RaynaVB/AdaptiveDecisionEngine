export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealTypeTag =
  // Base load
  | 'light'
  | 'regular'
  | 'heavy'
  // Craving
  | 'sweet'
  | 'savory'
  // Source
  | 'homemade'
  | 'restaurant'
  | 'packaged'
  // Impact
  | 'high_sugar'
  | 'fried_greasy'
  | 'high_protein'
  | 'high_fiber'
  | 'caffeinated'
  // Fallback
  | 'unknown';

export type MealReason = 'hungry' | 'meal_time' | 'social' | 'late_night' | 'boredom' | 'craving';

export type MealIngredientStatus = 'suggested' | 'confirmed' | 'removed' | 'added';
export type MealIngredientSource = 'visible' | 'inferred_dish_prior' | 'alias_mapped' | 'user_added';

export interface ConfirmedIngredient {
  ingredientId: string;
  canonicalName: string;
  confirmedStatus: MealIngredientStatus;
  source: MealIngredientSource;
  confidence: number;
}

export interface MealQuestion {
  questionId: string;
  text: string;
  answer: string;
}

export interface MealEvent {
  id: string; // uuid
  createdAt: string; // ISO
  occurredAt: string; // ISO
  mealSlot: MealSlot;
  inputMode: 'photo' | 'text';
  mealReason?: MealReason;
  mealTypeTags: MealTypeTag[]; // non-empty, fallback ['unknown']

  raw_text?: string;
  tags?: string[]; // ['spicy', 'carb', 'heavy']

  photoUri?: string;
  textDescription?: string;
  portionSize?: 'small' | 'medium' | 'large';
  notes?: string;

  // New fields for canonical capture
  dishId?: string;
  dishLabel?: string;
  confirmedIngredients?: ConfirmedIngredient[];
  questions?: MealQuestion[];
}


export type MoodValence = 'positive' | 'neutral' | 'negative';
export type MoodEnergy = 'high' | 'ok' | 'low';
export type MoodStress = 'low' | 'medium' | 'high';
export type MoodTag = 'anxious' | 'bored' | 'sad' | 'angry' | 'lonely' | 'celebratory';

export interface MoodEvent {
  id: string;
  createdAt: string; // ISO
  occurredAt: string; // ISO
  valence?: number | 'positive' | 'neutral' | 'negative';
  arousal?: number;
  energy?: 'high' | 'ok' | 'low';
  moodLabel?: string;
  stress?: MoodStress;

  tag?: MoodTag;
  notes?: string;
  linkedMealEventId?: string;
}

export type FeedbackOutcome = 'accepted_fully' | 'accepted_partially' | 'rejected';

export interface FeedbackEvent {
  id: string; // uuid
  recommendationId: string;
  recommendationType: string;
  title: string;
  action: string;
  outcome: FeedbackOutcome;
  timestamp: string; // ISO
}
