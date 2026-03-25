export type SymptomSeverity = -2 | -1 | 0 | 1 | 2 | 3;

export type SymptomCategory = 
  | 'digestive'
  | 'neurological'
  | 'energy'
  | 'mood'
  | 'sleep'
  | 'respiratory'
  | 'skin'
  | 'custom';

export interface SymptomEvent {
  id: string;
  symptomType: string;
  category: SymptomCategory;
  severity: SymptomSeverity;
  occurredAt: string; // Aligning with MealEvent/MoodEvent naming, or startedAt.
  endedAt?: string;
  isOngoing: boolean;
  durationMinutes?: number;
  bodyArea?: string;
  notes?: string;
  suspectedTriggerIds?: string[]; // IDs of meals/events
  tags?: string[];
  source: 'manual' | 'checkin' | 'predicted';
  createdAt: string;
}

export interface DailySymptomSummary {
  id: string; // e.g. YYYY-MM-DD
  date: string;
  symptomScores: Record<string, number>;
  totalSymptomLoad: number;
  topSymptoms: string[];
}
