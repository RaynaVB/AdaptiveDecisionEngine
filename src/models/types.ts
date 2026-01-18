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

export interface MealEvent {
  id: string; // uuid
  createdAt: string; // ISO
  occurredAt: string; // ISO
  mealSlot: MealSlot;
  inputMode: 'photo' | 'text';
  mealTypeTags: MealTypeTag[]; // non-empty, fallback ['unknown']

  photoUri?: string;
  textDescription?: string;
  portionSize?: 'small' | 'medium' | 'large';
  notes?: string;
}

export type MoodValence = 'positive' | 'neutral' | 'negative';
export type MoodEnergy = 'high' | 'ok' | 'low';
export type MoodStress = 'low' | 'medium' | 'high';
export type MoodTag = 'anxious' | 'bored' | 'sad' | 'angry' | 'lonely' | 'celebratory';

export interface MoodEvent {
  id: string;
  createdAt: string; // ISO
  occurredAt: string; // ISO
  valence: MoodValence;
  energy: MoodEnergy;
  stress: MoodStress;

  tag?: MoodTag;
  notes?: string;
  linkedMealEventId?: string;
}
