import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import App from './App';
import { widgetTaskHandler } from './src/widget/LoveWidget';

// ==========================================
// CRITICAL: Register Background Notification Handler
// This is THE key piece for receiving FCM push notifications
// when the app is killed/closed on Android.
// Must be registered at the entry point (index.js), NOT inside a component.
// ==========================================
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
    if (error) {
        console.log('BG Notification error:', error);
        return;
    }
    // data contains the notification content
    // When app is killed, this task handles incoming FCM push
    console.log('BG Notification received:', JSON.stringify(data));

    // The notification will be automatically shown by the OS
    // This handler allows us to perform additional work if needed
});

// Register the background notification task
Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(err => {
    console.log('Failed to register BG notification task:', err);
});

// Configure notification handler for foreground
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
