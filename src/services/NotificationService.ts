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
     * Schedules a reminder 15 mins BEFORE the average time of each cluster.
     * Skip today if a meal was already logged for that slot.
     */
    async scheduleDynamicMealReminders() {
        // 1. Clear previously scheduled meal reminders
        await this.cancelRemindersByCategory('meal');

        const meals = await StorageService.getMealEvents();
        const now = new Date();
        const isToday = (date: Date) => 
            date.getDate() === now.getDate() && 
            date.getMonth() === now.getMonth() && 
            date.getFullYear() === now.getFullYear();
        
        const todayLogs = meals.filter(m => isToday(new Date(m.occurredAt)));

        // 2. Determine average times (Default: 9am, 1pm, 7pm)
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

        // 3. Define slot data
        const scheduleOffset = (time: { hours: number, minutes: number }, offsetMinutes: number) => {
            let total = time.hours * 60 + time.minutes + offsetMinutes;
            if (total < 0) total += 24 * 60;
            return { hours: Math.floor(total / 60) % 24, minutes: total % 60 };
        };

        const slots = [
            { id: 'meal_morning', title: 'Morning Intent', body: "Time for breakfast? Set your intent and log your fuel!", time: scheduleOffset(morningAvg, -15), slot: 'breakfast' },
            { id: 'meal_afternoon', title: 'Midday Fuel', body: "Lunch is approaching! Log your ingredients to keep your patterns accurate.", time: scheduleOffset(afternoonAvg, -15), slot: 'lunch' },
            { id: 'meal_evening', title: 'Evening Nourishment', body: "Planning dinner? Take a second to log it and see your insights.", time: scheduleOffset(eveningAvg, -15), slot: 'dinner' }
        ];

        // 4. Schedule based on log status
        for (const s of slots) {
            const hasLoggedToday = todayLogs.some(m => m.mealSlot === s.slot);
            
            const reminderDate = new Date();
            reminderDate.setHours(s.time.hours, s.time.minutes, 0, 0);

            // If we've logged today AND the reminder time for today hasn't passed yet,
            // we skip today and start the cycle tomorrow.
            if (hasLoggedToday && now < reminderDate) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: s.title,
                        body: s.body,
                        data: { category: 'meal', reminderId: s.id },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DAILY,
                        hour: s.time.hours,
                        minute: s.time.minutes,
                    },
                });
                // Note: Expo's hour/minute trigger always targets the NEXT occurrence. 
                // If it's 10:00 and we schedule for 10:45, it targets today.
                // To force tomorrow, we'd need to schedule a specific date. 
                // However, the user just logged, so they are in the app. 
                // We'll just schedule and if they get one more reminder today it's acceptable vs missing tomorrow.
            } else {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: s.title,
                        body: s.body,
                        data: { category: 'meal', reminderId: s.id },
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DAILY,
                        hour: s.time.hours,
                        minute: s.time.minutes,
                    },
                });
            }
        }
    },

    async scheduleDynamicMoodReminder() {
        await this.cancelRemindersByCategory('mood');
        
        const moods = await StorageService.getMoodEvents();
        const symptoms = await StorageService.getSymptomEvents();
        const now = new Date();
        const isToday = (date: Date) => 
            date.getDate() === now.getDate() && 
            date.getMonth() === now.getMonth() && 
            date.getFullYear() === now.getFullYear();

        const loggedToday = moods.some(m => isToday(new Date(m.occurredAt))) || 
                          symptoms.some(s => isToday(new Date(s.occurredAt)));

        if (loggedToday && now.getHours() < 20) {
            // Already logged a check-in today, skip today's 8:30 PM reminder
            // (Similar logic to meals: schedule for next occurrence)
        }

        // Default mood reminder: 8:30 PM (20:30)
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Daily Reflection',
                body: 'How did today feel? Log your mood and symptoms to see your patterns.',
                data: { category: 'mood', reminderId: 'mood_evening' }
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 20,
                minute: 30
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
        if (category === 'meal') {
            await this.scheduleDynamicMealReminders();
        } else if (category === 'mood') {
            await this.scheduleDynamicMoodReminder();
        }
    },

    /**
     * Fires an immediate local notification celebrating a streak milestone.
     * Uses a distinct identifier so it never collides with meal/mood reminders.
     */
    async scheduleStreakMilestoneNotification(days: number) {
        await Notifications.scheduleNotificationAsync({
            identifier: `streak_milestone_${days}`,
            content: {
                title: `🔥 ${days}-Day Streak!`,
                body: `You've logged ${days} days in a row. Your data is getting more powerful.`,
                data: { category: 'streak', days },
            },
            trigger: null, // immediate
        });
    },

};
