// Test sending push notification directly via Expo Push API
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const app = initializeApp({
    apiKey: 'AIzaSyD1Mj8VpyRaiEbAZ0JoQiVwngJziaLDgkk',
    projectId: 'nhat-love-nhi',
    storageBucket: 'nhat-love-nhi.firebasestorage.app',
    messagingSenderId: '315027103246',
    appId: '1:315027103246:web:placeholder'
});
const db = getFirestore(app);

async function main() {
    const coupleCode = 'XRRJC9';

    // Get all tokens
    const snap = await getDocs(collection(db, 'couples', coupleCode, 'pushTokens'));
    const tokens = [];
    snap.forEach(d => {
        const data = d.data();
        tokens.push({ id: d.id, token: data.token, deviceId: data.deviceId });
        console.log(`Device: ${d.id} => Token: ${data.token}`);
    });

    console.log(`\nFound ${tokens.length} tokens. Sending test push to ALL...\n`);

    // Send to each token
    for (const t of tokens) {
        console.log(`\n--- Sending to ${t.id} ---`);
        try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: t.token,
                    title: '🔔 Test Push từ máy tính!',
                    body: 'Nếu thấy thông báo này = push notification HOẠT ĐỘNG! ' + new Date().toLocaleTimeString(),
                    sound: 'default',
                    priority: 'high',
                    channelId: 'love-messages',
                    _contentAvailable: true,
                    data: {
                        type: 'test',
                        title: 'Test Push',
                        body: 'Test background delivery',
                    },
                }),
            });
            const result = await response.json();
            console.log('Response:', JSON.stringify(result, null, 2));

            if (result.data && result.data[0]) {
                if (result.data[0].status === 'ok') {
                    console.log('✅ Push ACCEPTED by Expo! Ticket:', result.data[0].id);
                } else {
                    console.log('❌ Push REJECTED:', result.data[0].message, result.data[0].details);
                }
            }
        } catch (e) {
            console.log('❌ Error:', e.message);
        }
    }

    console.log('\n\nDone! Check both phones for notifications.');
    process.exit(0);
}

main();
