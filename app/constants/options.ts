export type OnboardingOption = {
  label: string;
  value: string;
};

export type OptionGroup = {
  category: string;
  categoryLabel: string;
  options: OnboardingOption[];
};

export const GOAL_OPTIONS: OnboardingOption[] = [
  {
    label: "Understand how food affects my body",
    value: "understand_food_body_connection",
  },
  {
    label: "Identify my food triggers",
    value: "identify_food_triggers",
  },
  {
    label: "Improve digestion & gut health",
    value: "improve_digestion",
  },
  {
    label: "Improve energy levels",
    value: "improve_energy",
  },
  {
    label: "Improve mood & mental clarity",
    value: "improve_mood_clarity",
  },
  {
    label: "Improve sleep quality",
    value: "improve_sleep",
  },
  {
    label: "Build healthier eating habits",
    value: "build_healthier_habits",
  },
];

export const SYMPTOM_GROUPS: OptionGroup[] = [
  {
    category: "digestive",
    categoryLabel: "Digestive",
    options: [
      { label: "Bloating", value: "bloating" },
      { label: "Gas", value: "gas" },
      { label: "Stomach pain", value: "stomach_pain" },
      { label: "Acid reflux", value: "acid_reflux" },
      { label: "Constipation", value: "constipation" },
      { label: "Diarrhea", value: "diarrhea" },
    ],
  },
  {
    category: "energy",
    categoryLabel: "Energy",
    options: [
      { label: "Fatigue", value: "fatigue" },
      { label: "Energy crashes", value: "energy_crashes" },
    ],
  },
  {
    category: "mental",
    categoryLabel: "Mental",
    options: [
      { label: "Brain fog", value: "brain_fog" },
      { label: "Mood swings", value: "mood_swings" },
      { label: "Anxiety", value: "anxiety" },
      { label: "Irritability", value: "irritability" },
    ],
  },
  {
    category: "physical",
    categoryLabel: "Physical",
    options: [
      { label: "Headaches", value: "headaches" },
      { label: "Skin issues", value: "skin_issues" },
      { label: "Sleep problems", value: "sleep_problems" },
    ],
  },
];

export const DIET_GROUPS: OptionGroup[] = [
  {
    category: "allergies",
    categoryLabel: "Allergies",
    options: [
      { label: "Peanuts", value: "peanut_allergy" },
      { label: "Tree nuts", value: "tree_nut_allergy" },
      { label: "Wheat / Gluten", value: "wheat_gluten_allergy" },
      { label: "Eggs", value: "egg_allergy" },
      { label: "Soy", value: "soy_allergy" },
      { label: "Fish/Shellfish", value: "fish_shellfish_allergy" },
    ],
  },
  {
    category: "dietary_preferences",
    categoryLabel: "Dietary Preferences",
    options: [
      { label: "Vegan", value: "vegan" },
      { label: "Vegetarian", value: "vegetarian" },
      { label: "Gluten-free", value: "gluten_free" },
      { label: "Dairy-free", value: "dairy_free" },
    ],
  },
  {
    category: "sensitivities",
    categoryLabel: "Sensitivities",
    options: [
      { label: "Lactose", value: "lactose_sensitive" },
      { label: "High-FODMAP foods", value: "high_fodmap_sensitive" },
      { label: "Spicy foods", value: "spicy_food_sensitive" },
      { label: "Caffeine", value: "caffeine_sensitive" },
      { label: "Sugar", value: "sugar_sensitive" },
      { label: "Fried/oily foods", value: "fried_oily_food_sensitive" },
      { label: "Artificial sweeteners", value: "artificial_sweetener_sensitive" },
      { label: "Alcohol", value: "alcohol_sensitive" },
    ],
  },
];

export const FREQUENCY_OPTIONS: OnboardingOption[] = [
  { label: "Rarely", value: "rarely" },
  { label: "A few times a week", value: "few_times_week" },
  { label: "Almost daily", value: "almost_daily" },
  { label: "After most meals", value: "most_meals" },
];

export const flattenGroupedOptions = (groups: OptionGroup[]) =>
  groups.flatMap((group) =>
    group.options.map((option) => ({
      ...option,
      category: group.category,
    }))
  );

export const SYMPTOM_OPTIONS = flattenGroupedOptions(SYMPTOM_GROUPS);
export const DIET_OPTIONS = flattenGroupedOptions(DIET_GROUPS);
