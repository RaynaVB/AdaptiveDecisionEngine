import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { StorageService } from './storage';
import { MealEvent } from '../models/types';

// Behavior for local notifications when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    } as any),
});

export const NotificationService = {
    async requestPermissions() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return false;
            }
            return true;
        } else {
            console.log('Must use physical device for Push Notifications');
            return false;
        }
    },

    /**
     * Calculates dynamic reminder times based on past meal logs.
     * Clusters meals into morning (5AM-11AM), afternoon (11AM-4PM), evening (4PM-10PM).
     * Schedules a reminder 30 mins after the average time of each cluster.
     */
    async scheduleDynamicMealReminders() {
        // Clear previously scheduled meal reminders
        await this.cancelRemindersByCategory('meal');

        const meals = await StorageService.getMealEvents();

        // Default times: 9:00 AM, 1:00 PM, 7:00 PM
        let morningAvg = { hours: 9, minutes: 0 };
        let afternoonAvg = { hours: 13, minutes: 0 };
        let eveningAvg = { hours: 19, minutes: 0 };

        if (meals.length > 0) {
            const getAverageTime = (filteredMeals: MealEvent[]) => {
                if (filteredMeals.length === 0) return null;
                let totalMinutes = 0;
                filteredMeals.forEach(m => {
                    const d = new Date(m.occurredAt);
                    totalMinutes += d.getHours() * 60 + d.getMinutes();
                });
                const avgMinutes = totalMinutes / filteredMeals.length;
                return {
                    hours: Math.floor(avgMinutes / 60),
                    minutes: Math.round(avgMinutes % 60)
                };
            };

            const morningMeals = meals.filter(m => { const h = new Date(m.occurredAt).getHours(); return h >= 5 && h < 11; });
            const afternoonMeals = meals.filter(m => { const h = new Date(m.occurredAt).getHours(); return h >= 11 && h < 16; });
            const eveningMeals = meals.filter(m => { const h = new Date(m.occurredAt).getHours(); return h >= 16 && h < 22; });

            const mTime = getAverageTime(morningMeals);
            const aTime = getAverageTime(afternoonMeals);
            const eTime = getAverageTime(eveningMeals);

            if (mTime) morningAvg = mTime;
            if (aTime) afternoonAvg = aTime;
            if (eTime) eveningAvg = eTime;
        }

        // Schedule 30 mins before average
        const scheduleOffset = (time: { hours: number, minutes: number }, offsetMinutes: number) => {
            let total = time.hours * 60 + time.minutes + offsetMinutes;
            if (total < 0) total += 24 * 60;
            return { hours: Math.floor(total / 60), minutes: total % 60 };
        };

        const reminders = [
            { id: 'meal_morning', title: 'Morning Fuel', body: "It's almost time for your morning meal. Remember to log it!", time: scheduleOffset(morningAvg, 30) },
            { id: 'meal_afternoon', title: 'Afternoon Energy', body: "Don't forget to eat and log your midday meal.", time: scheduleOffset(afternoonAvg, 30) },
            { id: 'meal_evening', title: 'Evening Nourishment', body: "Dinner time is approaching! Log what you eat.", time: scheduleOffset(eveningAvg, 30) }
        ];

        for (const r of reminders) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: r.title,
                    body: r.body,
                    data: { category: 'meal', reminderId: r.id },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: r.time.hours,
                    minute: r.time.minutes,
                },
            });
        }
    },

    async scheduleDynamicMoodReminder() {
        await this.cancelRemindersByCategory('mood');

        // Default mood reminder: 8:00 PM
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'How are you feeling?',
                body: 'Take a moment to check in and log your mood for the day.',
                data: { category: 'mood', reminderId: 'mood_evening' }
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 20,
                minute: 0
            }
        });

    },

    async cancelRemindersByCategory(category: string) {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if (n.content.data?.category === category) {
                await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
        }
    },

    async handleUserLoggedActivity(category: 'meal' | 'mood') {
        // Simple approach: calculate if they logged something recently, we might skip the NEXT reminder.
        // For now, when they log, let's just re-calculate the dynamic schedule to keep it fresh
        if (category === 'meal') {
            await this.scheduleDynamicMealReminders();
        } else if (category === 'mood') {
            await this.scheduleDynamicMoodReminder();
        }
    }

};
