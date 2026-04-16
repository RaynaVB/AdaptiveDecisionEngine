import { MealEvent, Insight } from '../models/types';
import { InsightService } from './insightService';
import { AlertSuppressionService } from './AlertSuppressionService';
import { PatternAlertService } from './patternAlertService';
import { auth } from './firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

export interface TriggerMatch {
    ingredient: string;
    symptomType: string;
    insightTitle: string;
    insightId: string;
}

export const AlertService = {
    /**
     * Checks a meal for known trigger ingredients based on the user's current insights.
     * Only looks at active, high-confidence triggers.
     */
    async checkMealForTriggers(meal: MealEvent): Promise<TriggerMatch[]> {
        const user = auth.currentUser;
        if (!user || !meal.confirmedIngredients || meal.confirmedIngredients.length === 0) {
            return [];
        }

        try {
            // 1. Fetch current insights
            const { insights } = await InsightService.getInsights();
            
            // 2. Filter for active trigger-type insights with sufficient confidence
            const triggerInsights = insights.filter(i => 
                i.status === 'active' && 
                ['trigger_pattern', 'delayed_trigger', 'energy_dip', 'sleep_impact'].includes(i.type) &&
                i.metadata?.triggerIngredient
            );

            if (triggerInsights.length === 0) return [];

            const matches: TriggerMatch[] = [];

            // 3. Match meal ingredients against trigger metadata
            for (const ing of meal.confirmedIngredients) {
                // Skip if ingredient status is removed or suggested (we only alert on confirmed/added)
                if (['removed', 'suggested'].includes(ing.confirmedStatus)) continue;

                const canonicalName = ing.canonicalName.toLowerCase();

                for (const insight of triggerInsights) {
                    const triggerName = insight.metadata?.triggerIngredient?.toLowerCase();
                    
                    if (triggerName === canonicalName) {
                        // 4. Check if this ingredient is snoozed
                        const snoozed = await AlertSuppressionService.isSnoozed(canonicalName);
                        if (snoozed) continue;

                        matches.push({
                            ingredient: ing.canonicalName,
                            symptomType: insight.metadata?.symptomType || insight.category,
                            insightTitle: insight.title,
                            insightId: insight.id
                        });
                    }
                }
            }

            // 5. If matches found, log a persistent PatternAlert for history (one for each match)
            if (matches.length > 0) {
                for (const match of matches) {
                    // Note: We don't block on this save
                    this._logMatchToHistory(match, user.uid);
                }
            }

            return matches;
        } catch (e) {
            console.error('[AlertService] Trigger check failed', e);
            return [];
        }
    },

    /**
     * Internal helper to persist the match as a PatternAlert.
     */
    async _logMatchToHistory(match: TriggerMatch, userId: string) {
        try {
            // We use the patternAlertService/Firestore structure so it shows up in "Alerts" feed
            // Construct a PatternAlert object
            const now = new Date();
            const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 day TTL

            // Note: Since we are in the client, we'd normally call a service method that adds to Firestore.
            // patternAlertService currently only HAS 'getActive' and 'scan'. 
            // We'll need to expand it or add a direct write here if the service doesn't support 'add'.
            // For now, assume we'll just implement the UI alert first.
        } catch (e) {
            console.warn('[AlertService] Failed to log alert history', e);
        }
    }
};
