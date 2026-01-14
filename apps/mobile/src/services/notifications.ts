// apps/mobile/services/notifications.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const PUSH_TOKEN_KEY = 'citypulse_push_token';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private pushToken: string | null = null;

  async initialize(): Promise<string | null> {
    // Check if physical device (required for push)
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get push token
    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      this.pushToken = tokenResponse.data;

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, this.pushToken);

      console.log('Push token:', this.pushToken);
      return this.pushToken;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  async getStoredToken(): Promise<string | null> {
    return AsyncStorage.getItem(PUSH_TOKEN_KEY);
  }

  // Add notification listeners
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Schedule local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>,
    trigger?: Notifications.NotificationTriggerInput
  ) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null, // null = immediate
    });
  }

  // Cancel all notifications
  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Set badge count
  async setBadgeCount(count: number) {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  // Android channel setup
  async setupAndroidChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E3A5F',
      });

      await Notifications.setNotificationChannelAsync('collection', {
        name: 'Collection',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 100],
      });

      await Notifications.setNotificationChannelAsync('earnings', {
        name: 'Earnings',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2E7D32',
      });
    }
  }
}

export const notificationService = new NotificationService();
