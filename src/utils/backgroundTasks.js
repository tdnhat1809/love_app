import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/config';
import {
    collection, query, orderBy, limit, getDocs, doc, setDoc, serverTimestamp, addDoc
} from 'firebase/firestore';

const LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';
const MESSAGE_CHECK_TASK = 'BACKGROUND_MESSAGE_CHECK';
const LAST_MSG_KEY = '@last_seen_msg_id';
const LAST_NOTIF_KEY = '@last_seen_notif_id';

// ==========================================
// BACKGROUND LOCATION TRACKING
// ==========================================

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
    if (error) { console.log('BG Location error:', error); return; }
    if (data) {
        const { locations } = data;
        const loc = locations[0];
        if (!loc) return;

        try {
            const code = await AsyncStorage.getItem('@couple_code');
            const deviceId = await AsyncStorage.getItem('@device_id');
            const role = await AsyncStorage.getItem('@user_role');
            if (!code || !deviceId) return;

            const { latitude, longitude, speed } = loc.coords;
            const spd = speed ? Math.round(speed * 3.6) : 0;
            const name = role === 'nhi' ? 'Nhi' : 'Nhật';

            const locRef = doc(db, 'couples', code, 'locations', deviceId);
            await setDoc(locRef, {
                latitude, longitude, speed: spd,
                role: role || 'nhat', name, deviceId,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            const lastHistKey = '@last_hist_time';
            const lastHist = await AsyncStorage.getItem(lastHistKey);
            const now = Date.now();
            if (!lastHist || now - parseInt(lastHist) > 30000) {
                await addDoc(collection(db, 'couples', code, 'locationHistory'), {
                    latitude, longitude, speed: spd,
                    role: role || 'nhat', name, deviceId,
                    timestamp: serverTimestamp(),
                });
                await AsyncStorage.setItem(lastHistKey, now.toString());
            }
        } catch (e) { console.log('BG loc sync error:', e); }
    }
});

export async function startBackgroundLocation() {
    try {
        const { status: fg } = await Location.requestForegroundPermissionsAsync();
        if (fg !== 'granted') return false;

        const { status: bg } = await Location.requestBackgroundPermissionsAsync();
        if (bg !== 'granted') return false;

        const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
        if (isStarted) return true;

        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10,
            deferredUpdatesInterval: 10000,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
                notificationTitle: 'Nhật ❤️ Nhi',
                notificationBody: 'Đang chia sẻ vị trí với người yêu',
                notificationColor: '#e94971',
            },
        });

        console.log('Background location started');
        return true;
    } catch (e) {
        console.log('Start BG location error:', e);
        return false;
    }
}

export async function stopBackgroundLocation() {
    try {
        const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
        if (isStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK);
            console.log('Background location stopped');
        }
    } catch (e) { console.log('Stop BG location error:', e); }
}

// ==========================================
// BACKGROUND MESSAGE CHECK (Fixed async)
// ==========================================

TaskManager.defineTask(MESSAGE_CHECK_TASK, async () => {
    try {
        const code = await AsyncStorage.getItem('@couple_code');
        const deviceId = await AsyncStorage.getItem('@device_id');
        if (!code || !deviceId) return BackgroundFetch.BackgroundFetchResult.NoData;

        let hasNew = false;

        // Check new chat messages — use for...of instead of forEach for proper async/await
        const msgRef = collection(db, 'couples', code, 'messages');
        const msgQ = query(msgRef, orderBy('createdAt', 'desc'), limit(3));
        const msgSnap = await getDocs(msgQ);
        const lastMsgId = await AsyncStorage.getItem(LAST_MSG_KEY);

        for (const d of msgSnap.docs) {
            const msg = d.data();
            if (d.id !== lastMsgId && msg.senderId !== deviceId) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `💌 ${msg.senderName || 'Người yêu'}`,
                        body: msg.text || 'Tin nhắn mới',
                        sound: 'default',
                        priority: 'high',
                        data: { type: 'chat' },
                        channelId: 'love-messages',
                    },
                    trigger: null,
                });
                await AsyncStorage.setItem(LAST_MSG_KEY, d.id);
                hasNew = true;
                break; // Only notify for latest unread
            }
        }

        // Check new love notifications
        const notifRef = collection(db, 'couples', code, 'notifications');
        const notifQ = query(notifRef, orderBy('createdAt', 'desc'), limit(3));
        const notifSnap = await getDocs(notifQ);
        const lastNotifId = await AsyncStorage.getItem(LAST_NOTIF_KEY);

        for (const d of notifSnap.docs) {
            const notif = d.data();
            if (d.id !== lastNotifId && notif.senderId !== deviceId) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `💕 ${notif.senderName || 'Người yêu'}`,
                        body: notif.text || 'Lời yêu thương',
                        sound: 'default',
                        priority: 'high',
                        data: { type: 'love' },
                        channelId: 'love-messages',
                    },
                    trigger: null,
                });
                await AsyncStorage.setItem(LAST_NOTIF_KEY, d.id);
                hasNew = true;
                break;
            }
        }

        return hasNew
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (e) {
        console.log('BG message check error:', e);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

export async function startBackgroundMessageCheck() {
    try {
        // Ensure notification channels exist
        await Notifications.setNotificationChannelAsync('love-messages', {
            name: 'Lời yêu thương',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B9D',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('daily-love', {
            name: 'Châm ngôn tình yêu hàng ngày',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 200, 200, 200],
            lightColor: '#E94971',
            sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('holiday-wishes', {
            name: 'Chúc mừng ngày lễ',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 300, 200, 300],
            lightColor: '#FFD54F',
            sound: 'default',
        });

        const status = await BackgroundFetch.getStatusAsync();
        if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
            console.log('Background fetch denied');
            return false;
        }

        // Unregister old task first to avoid duplicates
        const isRegistered = await TaskManager.isTaskRegisteredAsync(MESSAGE_CHECK_TASK);
        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(MESSAGE_CHECK_TASK);
        }

        await BackgroundFetch.registerTaskAsync(MESSAGE_CHECK_TASK, {
            minimumInterval: 30, // Check every 30 seconds (more frequent)
            stopOnTerminate: false,
            startOnBoot: true,
        });

        console.log('Background message check registered (30s interval)');
        return true;
    } catch (e) {
        console.log('Register BG message check error:', e);
        return false;
    }
}

// ==========================================
// DAILY MORNING LOVE QUOTE — 7:00 AM every day
// ==========================================
export async function scheduleDailyLoveQuote() {
    try {
        // Cancel any existing daily quote notifications
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if (n.content?.data?.type === 'daily-quote') {
                await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
        }

        // Import quote generator
        const { getDailyMorningQuote } = require('../data/quotesDB');
        const quote = getDailyMorningQuote();

        // Schedule daily at 7:00 AM
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '💕 Châm ngôn tình yêu hôm nay',
                body: quote.text,
                sound: 'default',
                priority: 'high',
                data: { type: 'daily-quote' },
                channelId: 'daily-love',
            },
            trigger: {
                type: 'daily',
                hour: 7,
                minute: 0,
            },
        });

        console.log('✅ Daily love quote scheduled at 7:00 AM');
        return true;
    } catch (e) {
        console.log('Schedule daily quote error:', e);
        return false;
    }
}

// ==========================================
// HOLIDAY AUTO-WISHES — Schedule notifications for all upcoming holidays
// ==========================================
export async function scheduleHolidayWishes() {
    try {
        // Cancel any existing holiday notifications
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if (n.content?.data?.type === 'holiday-wish') {
                await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
        }

        const { HOLIDAYS } = require('../data/holidays');
        const now = new Date();
        const currentYear = now.getFullYear();

        for (const holiday of HOLIDAYS) {
            let holidayDate = new Date(currentYear, holiday.month - 1, holiday.day, 8, 0, 0); // 8:00 AM on holiday
            if (holidayDate <= now) {
                holidayDate = new Date(currentYear + 1, holiday.month - 1, holiday.day, 8, 0, 0);
            }

            const diffMs = holidayDate - now;
            if (diffMs > 0 && diffMs < 365 * 24 * 60 * 60 * 1000) {
                // Schedule "coming soon" notification 3 days before
                const preDate = new Date(holidayDate.getTime() - 3 * 24 * 60 * 60 * 1000);
                if (preDate > now) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: `${holiday.emoji} ${holiday.name} sắp đến!`,
                            body: `Còn 3 ngày nữa là ${holiday.name}! Chuẩn bị quà cho Nhi nhé! 🎁`,
                            sound: 'default',
                            priority: 'high',
                            data: { type: 'holiday-wish', holidayName: holiday.name },
                            channelId: 'holiday-wishes',
                        },
                        trigger: { type: 'date', date: preDate },
                    });
                }

                // Schedule the actual holiday wish at 8:00 AM
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `🎉 ${holiday.name}!`,
                        body: holiday.wish,
                        sound: 'default',
                        priority: 'max',
                        data: { type: 'holiday-wish', holidayName: holiday.name },
                        channelId: 'holiday-wishes',
                    },
                    trigger: { type: 'date', date: holidayDate },
                });
            }
        }

        console.log('✅ Holiday wishes scheduled for all upcoming holidays');
        return true;
    } catch (e) {
        console.log('Schedule holiday wishes error:', e);
        return false;
    }
}

