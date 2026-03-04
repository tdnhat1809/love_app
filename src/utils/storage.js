import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    PHOTOS: '@love_photos',
    MESSAGES: '@love_messages',
    EVENTS: '@love_events',
    SETTINGS: '@love_settings',
};

// Photos
export async function savePhoto(photo) {
    try {
        const photos = await getPhotos();
        const newPhoto = {
            id: Date.now().toString(),
            uri: photo.uri,
            caption: photo.caption || '',
            date: photo.date || new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };
        photos.unshift(newPhoto);
        await AsyncStorage.setItem(KEYS.PHOTOS, JSON.stringify(photos));
        return newPhoto;
    } catch (e) {
        console.error('Error saving photo:', e);
        return null;
    }
}

export async function getPhotos() {
    try {
        const data = await AsyncStorage.getItem(KEYS.PHOTOS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error getting photos:', e);
        return [];
    }
}

export async function deletePhoto(id) {
    try {
        const photos = await getPhotos();
        const filtered = photos.filter(p => p.id !== id);
        await AsyncStorage.setItem(KEYS.PHOTOS, JSON.stringify(filtered));
        return true;
    } catch (e) {
        console.error('Error deleting photo:', e);
        return false;
    }
}

// Messages
export async function saveMessage(message) {
    try {
        const messages = await getMessages();
        const newMsg = {
            id: Date.now().toString(),
            text: message.text,
            from: message.from || 'Nhật',
            to: message.to || 'Nhi',
            sentAt: new Date().toISOString(),
            isRead: false,
        };
        messages.unshift(newMsg);
        await AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(messages));
        return newMsg;
    } catch (e) {
        console.error('Error saving message:', e);
        return null;
    }
}

export async function getMessages() {
    try {
        const data = await AsyncStorage.getItem(KEYS.MESSAGES);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error getting messages:', e);
        return [];
    }
}

// Events / Timeline
export async function saveEvent(event) {
    try {
        const events = await getEvents();
        const newEvent = {
            id: Date.now().toString(),
            title: event.title,
            description: event.description || '',
            date: event.date,
            emoji: event.emoji || '❤️',
            photoUri: event.photoUri || null,
            createdAt: new Date().toISOString(),
        };
        events.push(newEvent);
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
        return newEvent;
    } catch (e) {
        console.error('Error saving event:', e);
        return null;
    }
}

export async function getEvents() {
    try {
        const data = await AsyncStorage.getItem(KEYS.EVENTS);
        if (data) return JSON.parse(data);

        // Default events
        const defaults = [
            {
                id: '1',
                title: 'Ngày bắt đầu yêu nhau',
                description: 'Nhật và Nhi chính thức bên nhau 💕',
                date: '2022-05-25',
                emoji: '💕',
                photoUri: null,
                createdAt: '2022-05-25T00:00:00.000Z',
            },
        ];
        await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(defaults));
        return defaults;
    } catch (e) {
        console.error('Error getting events:', e);
        return [];
    }
}

export async function deleteEvent(id) {
    try {
        const events = await getEvents();
        const filtered = events.filter(e => e.id !== id);
        await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(filtered));
        return true;
    } catch (e) {
        console.error('Error deleting event:', e);
        return false;
    }
}

// Settings
export async function getSettings() {
    try {
        const data = await AsyncStorage.getItem(KEYS.SETTINGS);
        return data ? JSON.parse(data) : { theme: 'romantic', notificationsEnabled: true };
    } catch (e) {
        return { theme: 'romantic', notificationsEnabled: true };
    }
}

export async function saveSettings(settings) {
    try {
        await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
        return true;
    } catch (e) {
        return false;
    }
}
