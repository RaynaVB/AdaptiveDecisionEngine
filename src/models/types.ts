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

export type FeedbackOutcome = 'accepted' | 'rejected' | 'maybe' | 'dismissed' | 'completed';

export interface RecommendationAction {
  state: 'none' | FeedbackOutcome;
  actedAt?: string; // ISO
  reasonCode?: string;
  freeText?: string;
}

export interface FeedbackEvent {
  id: string; // uuid
  recommendationId: string;
  recommendationType: string;
  title: string;
  action: string;
  outcome: FeedbackOutcome;
  timestamp: string; // ISO
}
export interface Recommendation {
  id: string; // Instance UUID
  generationId: string;
  userId: string;
  type: string;
  category: string;
  title: string;
  summary: string;
  priorityScore: number;
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  rank: number;
  whyThis: Array<{
    kind: string;
    label: string;
  }>;
  cta?: {
    type: string;
    label: string;
    payload?: Record<string, any>;
  };
  action: RecommendationAction;
  linkedPatternIds: string[];
  scores: {
    impact: number;
    feasibility: number;
    mlScore: number;
    confidence: number;
    total: number;
  };
  associatedExperimentId?: string;
  createdAt: string; // ISO
}

export interface RecommendationGeneration {
  id: string;
  userId: string;
  generatedAt: string; // ISO
  trigger: 'meal_logged' | 'mood_logged' | 'symptom_logged' | 'feedback_submitted' | 'experiment_started' | 'experiment_completed' | 'manual_refresh';
  sourceEventId?: string;
  engineVersion: string;
  status: 'completed' | 'failed';
  recommendationCount: number;
  topRecommendationId?: string;
  inputSummary: {
    lastMealAt?: string;
    lastMoodAt?: string;
    lastSymptomAt?: string;
    lastExperimentUpdateAt?: string;
    lastFeedbackAt?: string;
  };
}

export interface RecommendationFeedResponse {
  generation: RecommendationGeneration;
  recommendations: Recommendation[];
}

export interface Pattern {
  id: string;
  templateId: string;
  patternType: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  segmentation?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'morning_afternoon' | 'afternoon_evening' | 'mixed';
    dayType?: 'weekday' | 'weekend' | 'mixed';
  };
  actionableInsight?: {
    label: string;
    actionType: 'start_experiment' | 'log_more' | 'lifestyle_change';
    experimentIdToStart?: string;
  };
}

export interface Insight {
  id: string; // Map from insightId in backend
  generationId: string;
  userId: string;
  type: string;
  category: string;
  title: string;
  summary: string;
  description?: string; // For backward compatibility
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  window?: {
    minHours: number;
    maxHours: number;
  };
  supportingEvidence: {
    matchCount: number;
    sampleSize: number;
  };
  status: string;
  relatedPatternIds?: string[];
  createdAt: string;
}

export interface InsightGeneration {
  id: string;
  userId: string;
  generatedAt: string;
  trigger: string;
  engineVersion: string;
  status: string;
  insightCount: number;
}

export interface InsightFeedResponse {
  generation: InsightGeneration;
  insights: Insight[];
}

export interface WeeklyItem {
  id: string;
  type: 'trend' | 'pattern' | 'win' | 'regression' | 'experiment_update' | 'segment' | 'guardrail';
  category: string;
  title: string;
  summary: string;
  confidenceScore: number;
  rank: number;
  metadata?: Record<string, any>;
}

export interface WeeklyGeneration {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  status: 'completed' | 'failed';
  summary: {
    title: string;
    subtitle: string;
  };
  stats: {
    mealCount: number;
    moodCount: number;
    symptomCount: number;
    experimentCount?: number;
  };
  dataSufficiency: {
    isSufficientOverall: boolean;
    [key: string]: any;
  };
  engineVersion: string;
}

export interface WeeklyPatternsResponse {
  generation: WeeklyGeneration;
  items: WeeklyItem[];
}
