import { Pattern, PatternContext } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const analyzeWeekdayWeekendShift = (context: PatternContext): Pattern[] => {
    const { meals } = context;
    const patterns: Pattern[] = [];

    // Filter snacks only? Or total meals? Prompt mentions "snack frequency".
    // Let's count snacks.
    const snacks = meals.filter(m => m.mealSlot === 'snack');
    if (snacks.length < 5) return []; // Need data

    let weekdaySnacks = 0;
    let weekendSnacks = 0;

    // Set to track distinct days
    const weekdayDays = new Set<string>();
    const weekendDays = new Set<string>();

    snacks.forEach(m => {
        const date = new Date(m.occurredAt);
        const day = date.getDay(); // 0 = Sun, 6 = Sat
        const dayStr = date.toDateString();

        if (day === 0 || day === 6) {
            weekendSnacks++;
            weekendDays.add(dayStr);
        } else {
            weekdaySnacks++;
            weekdayDays.add(dayStr);
        }
    });

    // Avoid division by zero
    if (weekdayDays.size === 0 || weekendDays.size === 0) return [];

    const weekdayFreq = weekdaySnacks / weekdayDays.size;
    const weekendFreq = weekendSnacks / weekendDays.size;

    const ratio = weekendFreq > 0 ? (weekdayFreq > 0 ? weekendFreq / weekdayFreq : 2.0) : 0;
    const inverseRatio = weekdayFreq > 0 ? (weekendFreq > 0 ? weekdayFreq / weekendFreq : 2.0) : 0;

    if (ratio >= 1.5) {
        patterns.push({
            id: uuidv4(),
            patternType: 'weekday_weekend_shift',
            title: 'Weekend Snacking Shift',
            description: `You snack ${ratio.toFixed(1)}x more often on weekends than weekdays.`,
            confidence: 'medium',
            evidence: { weekday_freq: weekdayFreq, weekend_freq: weekendFreq, ratio: ratio.toFixed(2) },
            windowStart: meals[meals.length - 1]?.occurredAt, // Oldest
            windowEnd: meals[0]?.occurredAt, // Newest (assuming sort)
            createdAt: new Date().toISOString()
        });
    } else if (inverseRatio >= 1.5) {
        patterns.push({
            id: uuidv4(),
            patternType: 'weekday_weekend_shift',
            title: 'Weekday Snacking Shift',
            description: `You snack ${inverseRatio.toFixed(1)}x more often on weekdays than weekends.`,
            confidence: 'medium',
            evidence: { weekday_freq: weekdayFreq, weekend_freq: weekendFreq, ratio: inverseRatio.toFixed(2) },
            windowStart: meals[0]?.occurredAt,
            windowEnd: meals[meals.length - 1]?.occurredAt,
            createdAt: new Date().toISOString()
        });
    }

    return patterns;
};
