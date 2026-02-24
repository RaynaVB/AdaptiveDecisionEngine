import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './app/AppNavigator';
import { NotificationService } from './src/services/NotificationService';

export default function App() {
  useEffect(() => {
    async function initNotifications() {
      const hasPermission = await NotificationService.requestPermissions();
      if (hasPermission) {
        // Schedule default / dynamic reminders initially
        await NotificationService.scheduleDynamicMealReminders();
        await NotificationService.scheduleDynamicMoodReminder();
      }
    }
    initNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
