import { MealEvent } from '../models/types';

export function formatMealSummary(meal: MealEvent): string {
    const slot = meal.mealSlot.charAt(0).toUpperCase() + meal.mealSlot.slice(1);

    // Filter out 'unknown' if there are other tags, or keep it if it's the only one
    let tagsToShow = meal.mealTypeTags.filter(t => t !== 'unknown');

    if (tagsToShow.length === 0) {
        if (meal.mealTypeTags.includes('unknown')) {
            return `${slot} • Unknown`;
        }
        // If data is somehow completely empty (should be caught by migration), fallback
        return `${slot} • Unknown`;
    }

    // Requirement: Show up to 2 tags. Prefer base load + one additional.
    // Base load tags: 'light', 'regular', 'heavy'
    const baseLoadTags = ['light', 'regular', 'heavy'];

    const baseLoad = tagsToShow.find(t => baseLoadTags.includes(t));
    const others = tagsToShow.filter(t => !baseLoadTags.includes(t));

    const finalTags: string[] = [];

    if (baseLoad) {
        finalTags.push(baseLoad);
    }

    // Fill remaining spots with other tags
    others.forEach(t => {
        if (finalTags.length < 2) {
            finalTags.push(t);
        }
    });

    // If we still have space and didn't use all tags, we could add another base load if multiple existed (unlikely)
    // or just stop. logic above prioritizes 1 base load + 1 other.

    // If no base load was found, we just take the first 2 others
    if (!baseLoad && finalTags.length < 2) {
        // reset and just take top 2
        finalTags.length = 0;
        tagsToShow.slice(0, 2).forEach(t => finalTags.push(t));
    }

    const formattedTags = finalTags.map(t => t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));

    return `${slot} • ${formattedTags.join(' • ')}`;
}
