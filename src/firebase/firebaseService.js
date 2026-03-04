import { db } from './config';
import {
    collection, addDoc, query, orderBy, onSnapshot,
    doc, setDoc, getDoc, serverTimestamp, limit,
    where, getDocs, updateDoc
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLoveNotification, requestNotificationPermission, getExpoPushToken, sendPushToToken } from '../utils/notifications';

const DEVICE_ID_KEY = '@device_id';
const COUPLE_CODE_KEY = '@couple_code';
const USER_ROLE_KEY = '@user_role';

// ==========================================
// DEVICE & ROLE
// ==========================================

export async function getDeviceId() {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

export async function getUserRole() {
    return await AsyncStorage.getItem(USER_ROLE_KEY);
}

export async function setUserRole(role) {
    await AsyncStorage.setItem(USER_ROLE_KEY, role);
}

// ==========================================
// PUSH TOKEN MANAGEMENT
// ==========================================

export async function registerPushToken() {
    try {
        console.log('[PUSH] Starting push token registration...');
        const token = await getExpoPushToken();
        if (!token) {
            console.log('[PUSH] ❌ No push token available (not a physical device or permission denied)');
            return null;
        }
        console.log('[PUSH] Got Expo push token:', token);

        const code = await getCoupleCode();
        const deviceId = await getDeviceId();
        console.log('[PUSH] Couple code:', code, 'Device ID:', deviceId);

        if (!code) {
            console.log('[PUSH] ⚠️ No couple code yet — token NOT saved to Firestore');
            console.log('[PUSH] Token will be saved after pairing');
            // Save token locally for later registration
            await AsyncStorage.setItem('@push_token', token);
            return token;
        }

        const tokenRef = doc(db, 'couples', code, 'pushTokens', deviceId);
        await setDoc(tokenRef, {
            token,
            deviceId,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        // Also save locally
        await AsyncStorage.setItem('@push_token', token);
        console.log('[PUSH] ✅ Push token SAVED to Firestore! Path: couples/' + code + '/pushTokens/' + deviceId);
        return token;
    } catch (e) {
        console.log('[PUSH] ❌ Register push token error:', e.message || e);
        return null;
    }
}

// Force re-register with retries — call after pairing
export async function forceRegisterPushToken(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        console.log(`[PUSH] Force register attempt ${i + 1}/${maxRetries}`);
        const token = await registerPushToken();
        if (token) {
            const code = await getCoupleCode();
            if (code) {
                console.log('[PUSH] ✅ Force register successful!');
                return token;
            }
        }
        // Wait 2 seconds before retry
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log('[PUSH] ❌ Force register failed after all retries');
    return null;
}

async function getPartnerPushToken() {
    try {
        const code = await getCoupleCode();
        const deviceId = await getDeviceId();
        if (!code) return null;

        const tokensRef = collection(db, 'couples', code, 'pushTokens');
        const snap = await getDocs(tokensRef);
        let partnerToken = null;
        snap.forEach((d) => {
            const data = d.data();
            if (data.deviceId !== deviceId && data.token) {
                partnerToken = data.token;
            }
        });
        return partnerToken;
    } catch (e) {
        console.log('Get partner token error:', e);
        return null;
    }
}

// Try push to partner, silently fail if not available
async function pushToPartner(title, body) {
    try {
        const token = await getPartnerPushToken();
        if (token) {
            const result = await sendPushToToken(token, title, body);
            console.log('Push sent to partner, result:', result);
        } else {
            console.log('[PUSH] No partner token found — cannot send push');
        }
    } catch (e) {
        console.log('Push to partner failed:', e);
    }
}

// ==========================================
// COUPLE PAIRING
// ==========================================

export async function createCoupleCode() {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    const deviceId = await getDeviceId();

    await setDoc(doc(db, 'couples', code), {
        code,
        device1: deviceId,
        device2: null,
        createdAt: serverTimestamp(),
        active: true,
    });

    await AsyncStorage.setItem(COUPLE_CODE_KEY, code);
    await registerPushToken();
    return code;
}

export async function joinCoupleCode(code) {
    const upperCode = code.toUpperCase();
    const coupleRef = doc(db, 'couples', upperCode);
    const coupleDoc = await getDoc(coupleRef);

    if (!coupleDoc.exists()) {
        throw new Error('Mã không tồn tại! Kiểm tra lại nhé 💔');
    }

    const data = coupleDoc.data();
    const deviceId = await getDeviceId();

    if (data.device1 === deviceId) {
        throw new Error('Bạn đã tạo mã này rồi! 😊');
    }

    if (data.device2 && data.device2 !== deviceId) {
        throw new Error('Mã đã được sử dụng bởi người khác! 😢');
    }

    await updateDoc(coupleRef, { device2: deviceId });
    await AsyncStorage.setItem(COUPLE_CODE_KEY, upperCode);
    await registerPushToken();
    return upperCode;
}

export async function getCoupleCode() {
    return await AsyncStorage.getItem(COUPLE_CODE_KEY);
}

export async function isPaired() {
    const code = await getCoupleCode();
    if (!code) return false;
    const coupleRef = doc(db, 'couples', code);
    const coupleDoc = await getDoc(coupleRef);
    if (!coupleDoc.exists()) return false;
    const data = coupleDoc.data();
    return !!(data.device1 && data.device2);
}

// ==========================================
// CHAT MESSAGES
// ==========================================

export async function sendChatMessage(text, imageBase64, videoUri) {
    const code = await getCoupleCode();
    const deviceId = await getDeviceId();
    const role = await getUserRole();
    if (!code) throw new Error('Chưa ghép đôi!');

    const senderName = role === 'nhi' ? 'Nhi' : 'Nhật';

    const msgData = {
        text,
        senderId: deviceId,
        senderName,
        createdAt: serverTimestamp(),
        read: false,
    };

    // If image base64 provided, upload and attach URL
    if (imageBase64) {
        try {
            const fullBase64 = 'data:image/jpeg;base64,' + imageBase64;
            // Try VPS first, then imgBB
            let imgResult = await uploadToVPS(fullBase64);
            if (!imgResult) imgResult = await uploadToImgBB(imageBase64);
            if (imgResult) msgData.imageUrl = imgResult.url;
        } catch (e) { console.log('Chat image upload error:', e); }
    }

    // If video URI provided, upload via FormData
    if (videoUri) {
        try {
            const vidResult = await uploadVideoToVPS(videoUri);
            if (vidResult) msgData.videoUrl = vidResult.url;
        } catch (e) { console.log('Chat video upload error:', e); }
    }

    await addDoc(collection(db, 'couples', code, 'messages'), msgData);

    // Send push notification to partner
    const preview = videoUri ? '🎬 Gửi video mới' : imageBase64 ? '📷 Gửi ảnh mới' : (text.length > 50 ? text.substring(0, 50) + '...' : text);
    await pushToPartner(`💌 ${senderName} ❤️ Nhi`, `💬 ${preview}`);
}

// Upload video file to VPS — try FormData, then base64 fallback
async function uploadVideoToVPS(uri) {
    // Method 1: Try FormData upload
    try {
        const filename = uri.split('/').pop() || 'video.mp4';
        const ext = filename.split('.').pop()?.toLowerCase() || 'mp4';
        const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';

        const formData = new FormData();
        formData.append('video', { uri, name: filename, type: mimeType });

        const response = await fetch(`${VPS_IMAGE_URL}/upload-video`, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = await response.json();
        if (data.success && data.url) {
            console.log('[VPS] Video uploaded via FormData:', data.url);
            return { url: data.url };
        }
    } catch (e) {
        console.log('[VPS] FormData video upload failed, trying base64:', e.message);
    }

    // Method 2: Base64 fallback via existing image endpoint
    try {
        const FileSystem = require('expo-file-system/legacy');
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const fullBase64 = 'data:video/mp4;base64,' + base64;
        const response = await fetch(`${VPS_IMAGE_URL}/upload-base64`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: fullBase64 }),
        });
        const data = await response.json();
        if (data.success && data.url) {
            console.log('[VPS] Video uploaded via base64:', data.url);
            return { url: data.url };
        }
    } catch (e) {
        console.log('[VPS] Base64 video upload also failed:', e.message);
    }

    return null;
}

export function listenToMessages(callback) {
    let unsubscribe = null;

    (async () => {
        const code = await getCoupleCode();
        if (!code) return;

        const msgRef = collection(db, 'couples', code, 'messages');
        const q = query(msgRef, orderBy('createdAt', 'desc'), limit(50));

        unsubscribe = onSnapshot(q, (snapshot) => {
            const messages = [];
            snapshot.forEach((doc) => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            callback(messages);
        });

        // Also show LOCAL notification for new messages from partner
        const deviceId = await getDeviceId();
        const newMsgQuery = query(msgRef, orderBy('createdAt', 'desc'), limit(1));

        onSnapshot(newMsgQuery, async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const msg = change.doc.data();
                    if (msg.senderId !== deviceId && msg.createdAt) {
                        await requestNotificationPermission();
                        await sendLoveNotification(`💌 ${msg.senderName}: ${msg.text}`);
                    }
                }
            });
        });
    })();

    return () => { if (unsubscribe) unsubscribe(); };
}

// Add emoji reaction to a message
export async function addReaction(messageId, emoji) {
    const code = await getCoupleCode();
    const role = await getUserRole();
    if (!code) return;
    const senderName = role === 'nhi' ? 'Nhi' : 'Nhật';
    const msgRef = doc(db, 'couples', code, 'messages', messageId);
    await updateDoc(msgRef, {
        [`reactions.${senderName}`]: emoji,
    });
}

// ==========================================
// LOVE NOTIFICATIONS (send to partner)
// ==========================================

export async function sendLoveNotificationToPartner(text) {
    const code = await getCoupleCode();
    const deviceId = await getDeviceId();
    const role = await getUserRole();
    if (!code) throw new Error('Chưa ghép đôi!');

    const senderName = role === 'nhi' ? 'Nhi' : 'Nhật';

    await addDoc(collection(db, 'couples', code, 'notifications'), {
        text,
        senderId: deviceId,
        senderName,
        createdAt: serverTimestamp(),
        read: false,
    });

    // Send push notification to partner
    const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
    await pushToPartner(`💕 ${senderName} gửi yêu thương`, `✨ ${preview}`);
}

export function listenToNotifications(callback) {
    let unsubscribe = null;
    (async () => {
        const code = await getCoupleCode();
        const deviceId = await getDeviceId();
        if (!code) return;

        // Record when listener started — skip old notifications to avoid duplicate alerts on app reopen
        const listenerStartTime = Date.now();
        let isFirstSnapshot = true;

        const notifRef = collection(db, 'couples', code, 'notifications');
        const q = query(notifRef, orderBy('createdAt', 'desc'), limit(1));

        unsubscribe = onSnapshot(q, async (snapshot) => {
            // Skip the very first snapshot — it contains existing docs, not new ones
            if (isFirstSnapshot) {
                isFirstSnapshot = false;
                return;
            }
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const notif = change.doc.data();
                    const notifTime = notif.createdAt?.toMillis?.() || notif.createdAt?.seconds * 1000 || 0;
                    // Only show notifications created AFTER listener started
                    if (notif.senderId !== deviceId && notifTime > listenerStartTime - 5000) {
                        await requestNotificationPermission();
                        await sendLoveNotification(`💕 ${notif.senderName}: ${notif.text}`);
                        if (callback) callback(notif);
                    }
                }
            });
        });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
}

// Listen to love messages (for MessagesScreen to show partner's messages)
export function listenToLoveMessages(callback) {
    let unsubscribe = null;
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;

        const notifRef = collection(db, 'couples', code, 'notifications');
        const q = query(notifRef, orderBy('createdAt', 'desc'), limit(50));

        unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = [];
            snapshot.forEach((d) => {
                msgs.push({ id: d.id, ...d.data() });
            });
            callback(msgs);
        });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
}

// ==========================================
// PARTNER STATUS
// ==========================================

export async function updateMyStatus(statusData) {
    const code = await getCoupleCode();
    const deviceId = await getDeviceId();
    const role = await getUserRole();
    if (!code) return;

    const statusRef = doc(db, 'couples', code, 'status', deviceId);
    await setDoc(statusRef, {
        ...statusData,
        role: role || 'nhat',
        name: role === 'nhi' ? 'Nhi' : 'Nhật',
        updatedAt: serverTimestamp(),
        deviceId,
    }, { merge: true });
}

export function listenToPartnerStatus(callback) {
    let unsubscribe = null;
    (async () => {
        const code = await getCoupleCode();
        const deviceId = await getDeviceId();
        if (!code) return;

        const statusRef = collection(db, 'couples', code, 'status');
        unsubscribe = onSnapshot(statusRef, (snapshot) => {
            snapshot.forEach((d) => {
                const data = d.data();
                if (data.deviceId !== deviceId) callback(data);
            });
        });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
}

// ==========================================
// MISS YOU COUNTER
// ==========================================

export async function sendMissYou() {
    const code = await getCoupleCode();
    const role = await getUserRole();
    if (!code) throw new Error('Chưa ghép đôi!');

    const senderName = role === 'nhi' ? 'Nhi' : 'Nhật';

    const missRef = doc(db, 'couples', code, 'missyou', 'counter');
    const missDoc = await getDoc(missRef);
    const current = missDoc.exists() ? (missDoc.data().count || 0) : 0;

    await setDoc(missRef, {
        count: current + 1,
        lastSender: role || 'nhat',
        lastSenderName: senderName,
        lastSentAt: serverTimestamp(),
    });

    // Send push + also save as love notification for partner
    try {
        await sendLoveNotificationToPartner(`${senderName} nhớ bạn! 💕 I Miss You`);
    } catch (e) { }

    return current + 1;
}

export function listenToMissYou(callback) {
    let unsubscribe = null;
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;
        const missRef = doc(db, 'couples', code, 'missyou', 'counter');
        unsubscribe = onSnapshot(missRef, (snap) => {
            if (snap.exists()) callback(snap.data());
            else callback({ count: 0 });
        });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
}

// ==========================================
// SHARED GALLERY (imgBB hosting + Firestore sync)
// ==========================================

const IMGBB_API_KEY = '76ba499c631def5335f8227ca2b63821';

// Upload image to imgBB, returns URL
async function uploadToImgBB(base64Image) {
    // Remove data:image prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', cleanBase64);

    const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
    });

    const result = await response.json();
    if (result.success) {
        return {
            url: result.data.display_url,
            thumb: result.data.thumb?.url || result.data.display_url,
            deleteUrl: result.data.delete_url,
        };
    }
    throw new Error(result.error?.message || 'Upload failed');
}

export async function uploadPhoto(photoData) {
    const code = await getCoupleCode();
    const role = await getUserRole();
    const deviceId = await getDeviceId();
    if (!code) throw new Error('Chưa ghép đôi!');

    // Try VPS first (full HD quality), fallback to imgBB
    let imgResult = await uploadToVPS('data:image/jpeg;base64,' + photoData.base64);
    if (!imgResult) {
        imgResult = await uploadToImgBB(photoData.base64);
    }

    // Save URL to Firestore (not base64 — no size limit!)
    await addDoc(collection(db, 'couples', code, 'gallery'), {
        uri: imgResult.url,
        thumb: imgResult.thumb,
        caption: photoData.caption || '',
        sender: role || 'nhat',
        senderName: role === 'nhi' ? 'Nhi' : 'Nhật',
        deviceId,
        createdAt: serverTimestamp(),
    });

    const senderName = role === 'nhi' ? 'Nhi' : 'Nhật';
    await pushToPartner(`📸 ${senderName} ❤️ Nhi`, `🌟 ${senderName} vừa thêm ảnh mới vào album tình yêu! Bấm để xem 💕`);
}

export function listenToGallery(callback) {
    let unsubscribe = null;
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;

        const galleryRef = collection(db, 'couples', code, 'gallery');
        const q = query(galleryRef, orderBy('createdAt', 'desc'), limit(100));

        unsubscribe = onSnapshot(q, (snapshot) => {
            const photos = [];
            snapshot.forEach((d) => {
                photos.push({ id: d.id, ...d.data() });
            });
            callback(photos);
        });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
}

// ==========================================
// AVATAR (Profile Photo)
// ==========================================

const VPS_IMAGE_URL = 'http://129.212.226.229';

async function uploadToVPS(base64Image) {
    try {
        const response = await fetch(`${VPS_IMAGE_URL}/upload-base64`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image }),
        });
        const data = await response.json();
        if (data.success) {
            console.log('[VPS] Image uploaded:', data.url);
            return { url: data.url, thumb: data.url };
        }
        throw new Error(data.error || 'VPS upload failed');
    } catch (e) {
        console.log('[VPS] Upload failed, falling back to imgBB:', e.message);
        return null;
    }
}

export async function saveAvatar(base64Image) {
    const code = await getCoupleCode();
    const deviceId = await getDeviceId();
    const role = await getUserRole();
    if (!code) throw new Error('Chưa ghép đôi!');

    // Try VPS first (full HD quality), fallback to imgBB
    let imgResult = await uploadToVPS(base64Image);
    if (!imgResult) {
        imgResult = await uploadToImgBB(base64Image);
    }

    // Save to Firestore
    const avatarRef = doc(db, 'couples', code, 'avatars', deviceId);
    await setDoc(avatarRef, {
        url: imgResult.url,
        thumb: imgResult.thumb,
        role: role || 'nhat',
        name: role === 'nhi' ? 'Nhi' : 'Nhật',
        deviceId,
        updatedAt: serverTimestamp(),
    }, { merge: true });

    // Also save locally
    await AsyncStorage.setItem('@my_avatar', imgResult.url);

    // Notify partner about avatar update
    const senderName = role === 'nhi' ? 'Nhi' : 'Nhật';
    await pushToPartner(`💝 ${senderName} ❤️ Nhi`, `✨ ${senderName} vừa cập nhật ảnh đại diện mới! Xinh lắm nè 🥰`);

    return imgResult.url;
}

export async function getMyAvatar() {
    return await AsyncStorage.getItem('@my_avatar');
}

export function listenToAvatars(callback) {
    let unsubscribe = null;
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;

        const avatarRef = collection(db, 'couples', code, 'avatars');
        unsubscribe = onSnapshot(avatarRef, (snapshot) => {
            const avatars = {};
            snapshot.forEach((d) => {
                const data = d.data();
                avatars[data.role || 'unknown'] = data;
            });
            callback(avatars);
        });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
}

// ==========================================
// LOCATION TRACKING
// ==========================================

export async function updateMyLocation(locationData) {
    const code = await getCoupleCode();
    const deviceId = await getDeviceId();
    const role = await getUserRole();
    if (!code) return;

    const locRef = doc(db, 'couples', code, 'locations', deviceId);
    await setDoc(locRef, {
        ...locationData,
        role: role || 'nhat',
        name: role === 'nhi' ? 'Nhi' : 'Nhật',
        deviceId,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

export function listenToPartnerLocation(callback) {
    let unsubscribe = null;
    (async () => {
        const code = await getCoupleCode();
        const deviceId = await getDeviceId();
        if (!code) return;

        const locRef = collection(db, 'couples', code, 'locations');
        unsubscribe = onSnapshot(locRef, (snapshot) => {
            snapshot.forEach((d) => {
                const data = d.data();
                if (data.deviceId !== deviceId) callback(data);
            });
        });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
}

export async function saveLocationHistory(entry) {
    const code = await getCoupleCode();
    const deviceId = await getDeviceId();
    const role = await getUserRole();
    if (!code) return;

    await addDoc(collection(db, 'couples', code, 'locationHistory'), {
        ...entry,
        role: role || 'nhat',
        name: role === 'nhi' ? 'Nhi' : 'Nhật',
        deviceId,
        timestamp: serverTimestamp(),
    });
}

export function listenToPartnerLocationHistory(callback) {
    let unsubscribe = null;
    (async () => {
        const code = await getCoupleCode();
        const deviceId = await getDeviceId();
        if (!code) return;

        const histRef = collection(db, 'couples', code, 'locationHistory');
        const q = query(histRef, orderBy('timestamp', 'desc'), limit(50));
        unsubscribe = onSnapshot(q, (snapshot) => {
            const history = [];
            snapshot.forEach((d) => {
                const data = d.data();
                if (data.deviceId !== deviceId) history.push({ id: d.id, ...data });
            });
            callback(history);
        });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
}

// ==========================================
// SAVED PLACES (Home, School, Company, etc.)
// ==========================================

export async function saveSavedPlace(place) {
    const code = await getCoupleCode();
    if (!code) return;
    const placeId = place.id || `place_${Date.now()}`;
    const placeRef = doc(db, 'couples', code, 'savedPlaces', placeId);
    await setDoc(placeRef, {
        ...place,
        id: placeId,
        radius: place.radius || 200, // meters
        updatedAt: serverTimestamp(),
    }, { merge: true });
    return placeId;
}

export async function getSavedPlaces() {
    const code = await getCoupleCode();
    if (!code) return [];
    const snap = await getDocs(collection(db, 'couples', code, 'savedPlaces'));
    const places = [];
    snap.forEach(d => places.push({ id: d.id, ...d.data() }));
    return places;
}

export async function deleteSavedPlace(placeId) {
    const code = await getCoupleCode();
    if (!code) return;
    const { deleteDoc } = require('firebase/firestore');
    await deleteDoc(doc(db, 'couples', code, 'savedPlaces', placeId));
}

export function listenToSavedPlaces(callback) {
    let unsubscribe = null;
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;
        unsubscribe = onSnapshot(collection(db, 'couples', code, 'savedPlaces'), (snap) => {
            const places = [];
            snap.forEach(d => places.push({ id: d.id, ...d.data() }));
            callback(places);
        });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
}

// ==========================================
// GEOFENCE - Check if partner is at saved place
// ==========================================

// Calculate distance in meters between two lat/lng points
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Track which place the partner was last at (to avoid duplicate notifications)
let lastPartnerPlace = null;

export function getPlaceForLocation(lat, lng, savedPlaces) {
    for (const place of savedPlaces) {
        const dist = haversineDistance(lat, lng, place.latitude, place.longitude);
        if (dist <= (place.radius || 200)) return place;
    }
    return null;
}

export async function checkGeofenceAndNotify(partnerLat, partnerLng, partnerName, savedPlaces) {
    const currentPlace = getPlaceForLocation(partnerLat, partnerLng, savedPlaces);
    const currentPlaceId = currentPlace ? currentPlace.id : null;

    if (currentPlaceId !== lastPartnerPlace) {
        if (currentPlace && !lastPartnerPlace) {
            // Partner ENTERED a saved place
            const typeEmoji = currentPlace.type === 'home' ? '🏠' : currentPlace.type === 'school' ? '🏫' : currentPlace.type === 'company' ? '💼' : '📍';
            await pushToPartner(
                `${typeEmoji} ${partnerName} đã đến ${currentPlace.name}`,
                `${partnerName} vừa đến ${currentPlace.name}`
            );
        } else if (!currentPlace && lastPartnerPlace) {
            // Partner LEFT a saved place - optional notification
            // Uncomment if you want leave notifications too
            // await pushToPartner(`🚶 ${partnerName} đã rời khỏi địa điểm`, '');
        }
        lastPartnerPlace = currentPlaceId;
    }

    return currentPlace;
}

// ==========================================
// LOVE LANGUAGE QUIZ
// ==========================================

// Save my quiz answers
// selfAnswers: { questionId: answerIndex } — my real answers about myself
// guessAnswers: { questionId: answerIndex } — my guesses about partner
export async function saveQuizAnswers(selfAnswers, guessAnswers) {
    const code = await getCoupleCode();
    const role = await getUserRole();
    if (!code || !role) return;

    const docRef = doc(db, 'couples', code, 'quiz', role);
    await setDoc(docRef, {
        selfAnswers,
        guessAnswers,
        completedAt: serverTimestamp(),
        role,
    });
}

// Listen to both quiz answers in real-time
export function listenToQuizAnswers(callback) {
    let code = null;

    (async () => {
        code = await getCoupleCode();
        if (!code) return;

        const quizRef = collection(db, 'couples', code, 'quiz');
        return onSnapshot(quizRef, (snap) => {
            const data = {};
            snap.forEach(d => { data[d.id] = d.data(); });
            callback(data);
        });
    })();

    // Return unsub placeholder (actual unsub is inside the async)
    return () => { };
}

// Compute quiz results — how well each person knows the other
export function computeQuizResults(quizData, myRole) {
    const partnerRole = myRole === 'nhat' ? 'nhi' : 'nhat';
    const myData = quizData[myRole];
    const partnerData = quizData[partnerRole];

    if (!myData || !partnerData) return null;

    // How well I know partner: compare my guessAnswers vs partner's selfAnswers
    let myCorrect = 0;
    let totalQ = 0;
    const myResults = {};

    Object.keys(myData.guessAnswers || {}).forEach(qId => {
        if (partnerData.selfAnswers && partnerData.selfAnswers[qId] !== undefined) {
            totalQ++;
            const correct = myData.guessAnswers[qId] === partnerData.selfAnswers[qId];
            if (correct) myCorrect++;
            myResults[qId] = {
                myGuess: myData.guessAnswers[qId],
                partnerReal: partnerData.selfAnswers[qId],
                correct,
            };
        }
    });

    // How well partner knows me: compare partner's guessAnswers vs my selfAnswers
    let partnerCorrect = 0;
    let partnerTotalQ = 0;
    const partnerResults = {};

    Object.keys(partnerData.guessAnswers || {}).forEach(qId => {
        if (myData.selfAnswers && myData.selfAnswers[qId] !== undefined) {
            partnerTotalQ++;
            const correct = partnerData.guessAnswers[qId] === myData.selfAnswers[qId];
            if (correct) partnerCorrect++;
            partnerResults[qId] = {
                partnerGuess: partnerData.guessAnswers[qId],
                myReal: myData.selfAnswers[qId],
                correct,
            };
        }
    });

    const myScore = totalQ > 0 ? Math.round((myCorrect / totalQ) * 100) : 0;
    const partnerScore = partnerTotalQ > 0 ? Math.round((partnerCorrect / partnerTotalQ) * 100) : 0;
    const overallScore = totalQ + partnerTotalQ > 0
        ? Math.round(((myCorrect + partnerCorrect) / (totalQ + partnerTotalQ)) * 100)
        : 0;

    return {
        myScore,           // How well I know partner (%)
        partnerScore,      // How well partner knows me (%)
        overallScore,      // Combined compatibility (%)
        myCorrect, totalQ,
        partnerCorrect, partnerTotalQ,
        myResults,
        partnerResults,
        bothCompleted: !!myData.completedAt && !!partnerData.completedAt,
    };
}

// ==========================================
// DAILY QUESTIONS
// ==========================================

export async function saveDailyAnswer(date, answer) {
    const code = await getCoupleCode();
    const role = await getUserRole();
    if (!code || !role) return;
    const docRef = doc(db, 'couples', code, 'dailyAnswers', `${date}_${role}`);
    await setDoc(docRef, { answer, role, date, answeredAt: serverTimestamp() });
}

export function listenToDailyAnswers(date, callback) {
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;
        const q1 = query(collection(db, 'couples', code, 'dailyAnswers'), where('date', '==', date));
        onSnapshot(q1, (snap) => {
            const data = {};
            snap.forEach(d => { data[d.data().role] = d.data(); });
            callback(data);
        });
    })();
    return () => { };
}

// ==========================================
// MOOD TRACKER
// ==========================================

export async function saveMood(date, mood) {
    const code = await getCoupleCode();
    const role = await getUserRole();
    if (!code || !role) return;
    const docRef = doc(db, 'couples', code, 'moods', `${date}_${role}`);
    await setDoc(docRef, { mood, role, date, savedAt: serverTimestamp() });
}

export function listenToMoods(callback) {
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;
        const q1 = query(collection(db, 'couples', code, 'moods'), orderBy('date', 'desc'), limit(30));
        onSnapshot(q1, (snap) => {
            const data = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() }));
            callback(data);
        });
    })();
    return () => { };
}

// ==========================================
// TIME CAPSULE
// ==========================================

export async function saveTimeCapsule(capsule) {
    const code = await getCoupleCode();
    const role = await getUserRole();
    if (!code || !role) return;
    await addDoc(collection(db, 'couples', code, 'timeCapsules'), {
        ...capsule, createdBy: role, createdAt: serverTimestamp(), opened: false,
    });
}

export function listenToTimeCapsules(callback) {
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;
        const q1 = query(collection(db, 'couples', code, 'timeCapsules'), orderBy('createdAt', 'desc'));
        onSnapshot(q1, (snap) => {
            const data = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() }));
            callback(data);
        });
    })();
    return () => { };
}

export async function openTimeCapsule(capsuleId) {
    const code = await getCoupleCode();
    if (!code) return;
    const docRef = doc(db, 'couples', code, 'timeCapsules', capsuleId);
    await updateDoc(docRef, { opened: true, openedAt: serverTimestamp() });
}

// ==========================================
// VIRTUAL PET
// ==========================================

export async function savePetData(petData) {
    const code = await getCoupleCode();
    if (!code) return;
    const docRef = doc(db, 'couples', code, 'pet', 'status');
    await setDoc(docRef, { ...petData, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToPet(callback) {
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;
        const docRef = doc(db, 'couples', code, 'pet', 'status');
        onSnapshot(docRef, (snap) => {
            callback(snap.exists() ? snap.data() : null);
        });
    })();
    return () => { };
}

export async function feedPet(action) {
    const code = await getCoupleCode();
    const role = await getUserRole();
    if (!code || !role) return;
    await addDoc(collection(db, 'couples', code, 'pet', 'status', 'actions'), {
        action, by: role, at: serverTimestamp(),
    });
}

// ==========================================
// SHARED JOURNAL
// ==========================================

export async function saveJournalEntry(entry) {
    const code = await getCoupleCode();
    const role = await getUserRole();
    if (!code || !role) return;
    await addDoc(collection(db, 'couples', code, 'journal'), {
        ...entry, author: role, createdAt: serverTimestamp(),
    });
}

export function listenToJournal(callback) {
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;
        const q1 = query(collection(db, 'couples', code, 'journal'), orderBy('createdAt', 'desc'), limit(50));
        onSnapshot(q1, (snap) => {
            const data = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() }));
            callback(data);
        });
    })();
    return () => { };
}


// ==========================================
// CUSTOM QUIZ QUESTIONS
// ==========================================

export async function saveCustomQuizQuestion(question) {
    const code = await getCoupleCode();
    const role = await getUserRole();
    if (!code || !role) return;
    await addDoc(collection(db, 'couples', code, 'customQuiz'), {
        ...question, createdBy: role, createdAt: serverTimestamp(),
    });
}

export function listenToCustomQuizQuestions(callback) {
    (async () => {
        const code = await getCoupleCode();
        if (!code) return;
        const q1 = query(collection(db, 'couples', code, 'customQuiz'), orderBy('createdAt', 'desc'));
        onSnapshot(q1, (snap) => {
            const data = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() }));
            callback(data);
        });
    })();
    return () => { };
}
