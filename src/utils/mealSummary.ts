import { MealEvent } from '../models/types';

export function formatMealSummary(meal: MealEvent): string {
    const slotValue = meal.mealSlot || 'unknown';
    const slot = slotValue.charAt(0).toUpperCase() + slotValue.slice(1);

    // Prioritize Confirmed Dish Label from AI or manual entry
    if (meal.dishLabel) {
        return `${slot} • ${meal.dishLabel}`;
    }

    // Filter out 'unknown' if there are other tags, or keep it if it's the only one
    let tagsToShow = meal.mealTypeTags.filter(t => t !== 'unknown');

    if (tagsToShow.length === 0) {
        if (meal.mealTypeTags.includes('unknown')) {
            // If we have text description but no tags/dish, use that or fallback
            return meal.textDescription ? `${slot} • ${meal.textDescription}` : `${slot} • Unknown`;
        }
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
