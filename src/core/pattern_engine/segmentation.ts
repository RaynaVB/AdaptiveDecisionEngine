import { MealEvent } from '../../models/types';
import { Pattern, Segmentation } from './types';

export function calculateSegmentation(events: MealEvent[]): Pattern['segmentation'] {
    if (events.length === 0) return undefined;

    let morning = 0, afternoon = 0, night = 0, lateNight = 0;
    let weekday = 0, weekend = 0;

    events.forEach(e => {
        const d = new Date(e.occurredAt);
        const h = d.getHours();
        const day = d.getDay(); // 0=Sun, 6=Sat

        // Time segments
        if (h >= 5 && h < 11) morning++;
        else if (h >= 11 && h < 17) afternoon++;
        else if (h >= 17) night++; // 5pm to midnight (actually 5pm to 23:59) - Wait, 17 to 24? 
        // Logic check: 17 = 5pm. 23 = 11pm. 0 = 12am.
        // My previous logic in P2 was >= 21 || < 4.
        // Let's stick to standard defs:
        // Morning: 5-11
        // Afternoon: 11-17 (5pm)
        // Night: 17-24 (Midnight)
        // Late Night: 0-5

        if (h >= 17) night++;
        else if (h < 5) lateNight++;

        // Day type
        if (day === 0 || day === 6) weekend++;
        else weekday++;
    });

    const total = events.length;

    // Determine dominant time
    let timeOfDay: Segmentation['timeOfDay'] = 'mixed';
    if (morning / total > 0.6) timeOfDay = 'morning';
    else if (afternoon / total > 0.6) timeOfDay = 'afternoon';
    else if (night / total > 0.6) timeOfDay = 'night';
    else if (lateNight / total > 0.6) timeOfDay = 'late_night';

    // Determine dominant day
    let dayType: Segmentation['dayType'] = 'mixed';
    if (weekday / total > 0.8) dayType = 'weekday'; // Higher threshold for weekday since 5/7 is normal
    else if (weekend / total > 0.6) dayType = 'weekend'; // 2/7 is normal, so > 60% is significant

    return { timeOfDay, dayType };
}
