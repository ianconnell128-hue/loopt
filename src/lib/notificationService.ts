import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are presented when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

/**
 * Configure Android notification channels for instant message delivery
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chat_messages', {
      name: 'Loopt Direct Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9F0A', // Loopt Amber
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });
  }
}

/**
 * Request user permission for push/local notifications
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    await setupNotificationChannels();
    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Failed to request notification permissions:', err);
    return false;
  }
}

/**
 * Trigger an instant high-priority notification for a new message
 */
export async function sendLocalMessageNotification(
  senderName: string,
  messageText: string,
  conversationId: string
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 ${senderName}`,
        body: messageText,
        data: { conversationId, type: 'chat_message' },
        sound: 'default',
        color: '#FF9F0A',
        badge: 1,
      },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn('Failed to schedule local notification:', err);
  }
}
