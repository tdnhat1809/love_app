import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import App from './App';
import { widgetTaskHandler } from './src/widget/LoveWidget';

// ==========================================
// Background Notification Handler
// For DATA-ONLY FCM messages: we create a local notification
// so it shows in system tray (since FCM won't auto-show data-only)
// ==========================================
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
    if (error) return;
    console.log('BG Notification received:', JSON.stringify(data));

    // For data-only FCM, create local notification
    try {
        const notifData = data?.notification?.data || data?.data || {};
        const title = notifData.title || '💕 Tin nhắn mới';
        const body = notifData.body || 'Bạn có tin nhắn mới!';

        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: notifData,
            },
            trigger: null, // Show immediately
        });
    } catch (e) {
        console.log('BG local notification error:', e);
    }
});

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(err => {
    console.log('Failed to register BG notification task:', err);
});

// Foreground handler: show in-app alert for NEW notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
    }),
});

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
