import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getRandomMessage } from '../data/quotes';
import Constants from 'expo-constants';

// Note: setNotificationHandler is now in index.js (entry point)
// This ensures it runs before any component mounts

// Debug info - will be shown on screen via Alert
export let pushTokenDebugInfo = '';

export async function requestNotificationPermission() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('love-messages', {
            name: 'Lời yêu thương',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B9D',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        });
        await Notifications.setNotificationChannelAsync('distance-tracker', {
            name: 'Khoảng cách',
            importance: Notifications.AndroidImportance.LOW,
            vibrationPattern: null,
            enableVibrate: false,
            showBadge: false,
            sound: null,
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

// Get Expo Push Token for this device
export async function getExpoPushToken() {
    let dbg = '';
    try {
        dbg += `isDevice: ${Device.isDevice}\n`;
        if (!Device.isDevice) {
            pushTokenDebugInfo = dbg + 'STOP: not physical device';
            return null;
        }

        const granted = await requestNotificationPermission();
        dbg += `permission: ${granted}\n`;
        if (!granted) {
            pushTokenDebugInfo = dbg + 'STOP: no permission';
            return null;
        }

        let token = null;

        // Method 1: Expo token with hardcoded projectId
        try {
            dbg += 'M1: getExpoPushTokenAsync...\n';
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: '5ab56ae9-fd5c-43da-a88c-6465f4d86517',
            });
            token = tokenData.data;
            dbg += `M1 OK: ${token}\n`;
        } catch (e1) {
            dbg += `M1 ERR: ${e1.message || e1}\n`;

            // Method 2: Constants projectId
            try {
                const pid = Constants.expoConfig?.extra?.eas?.projectId
                    || Constants.manifest?.extra?.eas?.projectId;
                dbg += `M2: pid=${pid}\n`;
                if (pid) {
                    const td = await Notifications.getExpoPushTokenAsync({ projectId: pid });
                    token = td.data;
                    dbg += `M2 OK: ${token}\n`;
                } else {
                    dbg += 'M2 SKIP: no pid\n';
                }
            } catch (e2) {
                dbg += `M2 ERR: ${e2.message || e2}\n`;
            }

            // Method 3: Native FCM token
            if (!token) {
                try {
                    dbg += 'M3: getDevicePushTokenAsync...\n';
                    const dt = await Notifications.getDevicePushTokenAsync();
                    token = dt.data;
                    dbg += `M3 OK: ${typeof token === 'string' ? token.substring(0, 40) : JSON.stringify(token)}\n`;
                } catch (e3) {
                    dbg += `M3 ERR: ${e3.message || e3}\n`;
                }
            }
        }

        dbg += token ? `FINAL OK: ${token}` : 'FINAL: ALL FAILED';
        pushTokenDebugInfo = dbg;
        return token;
    } catch (e) {
        dbg += `OUTER ERR: ${e.message || e}`;
        pushTokenDebugInfo = dbg;
        return null;
    }
}

// Send push notification to a specific Expo Push Token (cross-device)
export async function sendPushToToken(pushToken, title, body) {
    if (!pushToken) return;

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: pushToken,
                title: title || 'Nhật ❤️ Nhi',
                body: body,
                sound: 'default',
                priority: 'high',
                channelId: 'love-messages',
                // Critical for background delivery on Android
                _contentAvailable: true,
                data: {
                    title: title || 'Nhật ❤️ Nhi',
                    body: body,
                    type: 'message',
                },
            }),
        });
        const result = await response.json();
        console.log('Push result:', JSON.stringify(result));
    } catch (e) {
        console.log('Push send error:', e);
    }
}

// Local notification (for self)
export async function sendLoveNotification(message) {
    const text = message || getRandomMessage();

    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Nhật ❤️ Nhi',
            body: text,
            sound: 'default',
            data: { type: 'love-message' },
        },
        trigger: null,
    });

    return text;
}

export async function scheduleDailyLoveNotification(hour = 8, minute = 0) {
    await cancelScheduledNotifications();

    await Notifications.scheduleNotificationAsync({
        content: {
            title: '💕 Nhật ❤️ Nhi 💕',
            body: getRandomMessage(),
            sound: 'default',
            data: { type: 'daily-love' },
        },
        trigger: {
            type: 'daily',
            hour,
            minute,
            repeats: true,
        },
    });
}

export async function scheduleNotificationAtTime(message, date) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '💌 Lời yêu thương từ Nhật',
            body: message,
            sound: 'default',
            data: { type: 'scheduled-love' },
        },
        trigger: {
            type: 'date',
            date: new Date(date),
        },
    });
}

export async function cancelScheduledNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
}

// Distance notification — persistent sticky notification showing distance
const DISTANCE_NOTIF_ID = 'distance-notification';

export async function sendDistanceNotification(distanceKm, myName, partnerName, togetherDays) {
    const distStr = distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} m`
        : `${distanceKm.toFixed(1)} km`;

    const togetherStr = togetherDays != null
        ? `Bên nhau ${togetherDays} ngày`
        : 'Bên nhau mỗi ngày';

    const nearbyMsg = distanceKm < 0.1 ? '🥰 Đang ở rất gần nhau!'
        : distanceKm < 1 ? '😊 Gần nhau lắm rồi!'
            : distanceKm < 5 ? '💕 Khoảng cách không xa'
                : '🌏 Đang xa nhau...';

    await Notifications.scheduleNotificationAsync({
        identifier: DISTANCE_NOTIF_ID,
        content: {
            title: `💑 ${myName} ❤️ ${partnerName} • ${distStr}`,
            body: `${nearbyMsg}\n📍 Khoảng cách: ${distStr}\n🗓️ ${togetherStr}`,
            sound: null,
            sticky: true,
            autoDismiss: false,
            priority: 'low',
            data: { type: 'distance' },
            ...(Platform.OS === 'android' ? { channelId: 'distance-tracker' } : {}),
        },
        trigger: null,
    });
}

export async function dismissDistanceNotification() {
    await Notifications.dismissNotificationAsync(DISTANCE_NOTIF_ID);
}
