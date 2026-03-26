import { MealEvent } from '../models/types';

export function formatMealSummary(meal: MealEvent): string {
    const slotValue = meal.mealSlot || 'unknown';
    const slot = slotValue.charAt(0).toUpperCase() + slotValue.slice(1);

    // Prioritize Confirmed Dish Label from AI or manual entry
    if (meal.dishLabel) {
        return `${slot} • ${meal.dishLabel}`;
    }

    // New Ingredient-based summary
    if (meal.confirmedIngredients && meal.confirmedIngredients.length > 0) {
        // Show up to 2 ingredients
        const ingredientsToShow = meal.confirmedIngredients
            .slice(0, 2)
            .map(i => i.canonicalName);
        
        const summary = ingredientsToShow.join(' • ');
        return `${slot} • ${summary}${meal.confirmedIngredients.length > 2 ? ' ...' : ''}`;
    }

    // Fallback to text description
    if (meal.textDescription) {
        // Truncate text description if too long
        const truncated = meal.textDescription.length > 30 
            ? meal.textDescription.substring(0, 27) + "..." 
            : meal.textDescription;
        return `${slot} • ${truncated}`;
    }

    return `${slot} • Unknown`;
}
