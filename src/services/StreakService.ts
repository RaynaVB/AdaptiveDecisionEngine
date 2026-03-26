import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealEvent, MoodEvent } from '../models/types';
import { SymptomEvent } from '../models/Symptom';

const STORAGE_KEY = 'veyra_streaks_meta';
const MILESTONES = [3, 7, 14, 30, 60, 100];

export interface StreakData {
  loggingStreak: number;
  longestLoggingStreak: number;
  symptomFreeStreak: number;
  longestSymptomFreeStreak: number;
  totalLoggingDays: number;
  milestonesHit: number[];
}

interface PersistedMeta {
  longestLoggingStreak: number;
  longestSymptomFreeStreak: number;
  milestonesHit: number[];
}

/** Format a Date as YYYY-MM-DD in the device's LOCAL timezone. */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Convert an ISO timestamp to a LOCAL calendar date string.
 * A 10:30pm log is "today" for the user regardless of UTC date.
 */
function toDateStr(iso: string): string {
  return localDateStr(new Date(iso));
}

function todayStr(): string {
  return localDateStr(new Date());
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}

/** Subtract one calendar day from a YYYY-MM-DD local date string. */
function prevDayStr(dateStr: string): string {
  // Parse as local noon to avoid DST edge cases
  const [y, mo, day] = dateStr.split('-').map(Number);
  const d = new Date(y, mo - 1, day, 12, 0, 0);
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}

function countConsecutiveDaysBack(
  sortedDescDates: string[],
  presentDates: Set<string>
): number {
  if (sortedDescDates.length === 0) return 0;

  const today = todayStr();
  const yesterday = yesterdayStr();
  
  // Find the first date in the sorted list that is today or earlier.
  // This allows the streak to continue even if there are future-dated logs (common in seeding).
  const startIndex = sortedDescDates.findIndex(d => d <= today);
  if (startIndex === -1) {
    // All logs are in the future? Check if yesterday has a log.
    if (presentDates.has(yesterday)) {
      // Start from yesterday
      let count = 0;
      let curStr = yesterday;
      while (presentDates.has(curStr)) {
        count++;
        curStr = prevDayStr(curStr);
      }
      return count;
    }
    return 0;
  }

  const mostRecentEffective = sortedDescDates[startIndex];

  // Streak only counts if the user logged today or yesterday
  if (mostRecentEffective !== today && mostRecentEffective !== yesterday) return 0;

  let count = 0;
  let curStr = mostRecentEffective;

  while (presentDates.has(curStr)) {
    count++;
    curStr = prevDayStr(curStr);
  }

  return count;
}

async function loadMeta(): Promise<PersistedMeta> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedMeta;
  } catch {
    // ignore
  }
  return { longestLoggingStreak: 0, longestSymptomFreeStreak: 0, milestonesHit: [] };
}

async function saveMeta(meta: PersistedMeta): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

export const StreakService = {
  /**
   * Computes all streak metrics from the full event history.
   * Reads and updates persisted personal records via AsyncStorage.
   */
  async computeStreaks(
    meals: MealEvent[],
    moods: MoodEvent[],
    symptoms: SymptomEvent[]
  ): Promise<StreakData> {
    // --- Logging streak (any event type) ---
    const loggedDays = new Set<string>();
    meals.forEach(e => loggedDays.add(toDateStr(e.occurredAt)));
    moods.forEach(e => loggedDays.add(toDateStr(e.occurredAt)));
    symptoms.forEach(e => loggedDays.add(toDateStr(e.occurredAt)));

    const sortedLogDays = Array.from(loggedDays).sort((a, b) => b.localeCompare(a));
    const loggingStreak = countConsecutiveDaysBack(sortedLogDays, loggedDays);
    const totalLoggingDays = loggedDays.size;

    // --- Symptom-free streak ---
    const symptomDays = new Set<string>();
    symptoms.forEach(e => symptomDays.add(toDateStr(e.occurredAt)));

    let symptomFreeStreak = 0;
    const today = todayStr();
    let sfCursor = today;

    // Walk backward from today counting consecutive days with no symptoms
    for (let i = 0; i < 365; i++) {
      if (symptomDays.has(sfCursor)) break;
      // Only count days where the user actually logged something (or today)
      if (loggedDays.has(sfCursor) || sfCursor === today) {
        symptomFreeStreak++;
      }
      sfCursor = prevDayStr(sfCursor);
    }

    // --- Load and update persisted personal records ---
    const meta = await loadMeta();

    const longestLoggingStreak = Math.max(meta.longestLoggingStreak, loggingStreak);
    const longestSymptomFreeStreak = Math.max(meta.longestSymptomFreeStreak, symptomFreeStreak);

    await saveMeta({
      longestLoggingStreak,
      longestSymptomFreeStreak,
      milestonesHit: meta.milestonesHit,
    });

    return {
      loggingStreak,
      longestLoggingStreak,
      symptomFreeStreak,
      longestSymptomFreeStreak,
      totalLoggingDays,
      milestonesHit: meta.milestonesHit,
    };
  },

  /**
   * Returns the highest newly-crossed milestone day count, or null if none.
   * Updates the persisted milestonesHit list on a new milestone.
   */
  async getNewMilestone(streakData: StreakData): Promise<number | null> {
    const meta = await loadMeta();
    const alreadyHit = new Set(meta.milestonesHit);

    const newMilestone = MILESTONES.filter(
      m => streakData.loggingStreak >= m && !alreadyHit.has(m)
    ).pop() ?? null; // highest newly crossed

    if (newMilestone !== null) {
      const updatedHit = Array.from(new Set([...meta.milestonesHit, newMilestone]));
      await saveMeta({
        longestLoggingStreak: meta.longestLoggingStreak,
        longestSymptomFreeStreak: meta.longestSymptomFreeStreak,
        milestonesHit: updatedHit,
      });
    }

    return newMilestone;
  },

  /** Clears all persisted streak metadata (useful for testing/admin reset). */
  async resetMeta(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
