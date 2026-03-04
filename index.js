import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import App from './App';
import { widgetTaskHandler } from './src/widget/LoveWidget';

// ==========================================
// Background Notification Handler
// ==========================================
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
    if (error) return;
    console.log('BG Notification received:', JSON.stringify(data));
});

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(err => {
    console.log('Failed to register BG notification task:', err);
});

// Configure notification handler for foreground
// Only show in-app alert when app is ACTIVELY in foreground
// This prevents duplicate: FCM shows in system tray + in-app alert
Notifications.setNotificationHandler({
    handleNotification: async () => {
        const isActive = AppState.currentState === 'active';
        return {
            shouldShowAlert: isActive,
            shouldPlaySound: isActive,
            shouldSetBadge: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
        };
    },
});

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
