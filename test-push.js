// Test push notification delivery by reading tokens from Firestore and sending test push
// Then checking the receipt to verify delivery

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyBQ1234fake", // We'll read from the app's config
    projectId: "nhat-love-nhi",
};

// Read real config
const fs = require('fs');
const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));

async function testPush() {
    console.log('=== EXPO PUSH NOTIFICATION DEBUG TEST ===\n');

    // Step 1: Read tokens from Firestore
    console.log('Step 1: Reading push tokens from Firestore...');

    const configPath = './src/firebase/config.js';
    const configContent = fs.readFileSync(configPath, 'utf8');

    // Extract firebase config
    const apiKeyMatch = configContent.match(/apiKey:\s*['"](.+?)['"]/);
    const authDomainMatch = configContent.match(/authDomain:\s*['"](.+?)['"]/);
    const projectIdMatch = configContent.match(/projectId:\s*['"](.+?)['"]/);
    const appIdMatch = configContent.match(/appId:\s*['"](.+?)['"]/);

    const config = {
        apiKey: apiKeyMatch?.[1],
        authDomain: authDomainMatch?.[1],
        projectId: projectIdMatch?.[1],
        appId: appIdMatch?.[1],
    };

    console.log('Firebase config:', JSON.stringify(config, null, 2));

    const app = initializeApp(config, 'test');
    const db = getFirestore(app);

    // Find couple code
    const couplesSnap = await getDocs(collection(db, 'couples'));
    let coupleCode = null;
    couplesSnap.forEach(doc => {
        if (doc.data().active) {
            coupleCode = doc.id;
            console.log('Couple:', doc.id, JSON.stringify(doc.data()));
        }
    });

    if (!coupleCode) {
        console.log('No active couple found!');
        return;
    }

    // Read push tokens
    console.log('\nStep 2: Reading push tokens...');
    const tokensSnap = await getDocs(collection(db, 'couples', coupleCode, 'pushTokens'));
    const tokens = [];
    tokensSnap.forEach(doc => {
        const data = doc.data();
        console.log('Token doc:', doc.id, JSON.stringify(data));
        tokens.push(data);
    });

    if (tokens.length === 0) {
        console.log('❌ NO PUSH TOKENS FOUND! This is why notifications are not being delivered.');
        console.log('   The app needs to register push tokens when it starts.');
        return;
    }

    // Step 3: Send test push to each token
    for (const tokenData of tokens) {
        const pushToken = tokenData.token;
        console.log(`\nStep 3: Sending test push to ${pushToken.substring(0, 30)}...`);

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: pushToken,
                title: '🔔 Test Push',
                body: 'Đây là test push notification lúc ' + new Date().toLocaleTimeString(),
                sound: 'default',
                priority: 'high',
                channelId: 'love-messages',
                _contentAvailable: true,
                data: { type: 'test' },
            }),
        });

        const result = await response.json();
        console.log('Push ticket:', JSON.stringify(result, null, 2));

        // Check receipt
        if (result.data && result.data[0] && result.data[0].id) {
            const ticketId = result.data[0].id;
            console.log('\nStep 4: Checking push receipt for ticket:', ticketId);
            console.log('Waiting 5 seconds...');
            await new Promise(r => setTimeout(r, 5000));

            const receiptRes = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: [ticketId] }),
            });
            const receiptResult = await receiptRes.json();
            console.log('Receipt:', JSON.stringify(receiptResult, null, 2));

            if (receiptResult.data && receiptResult.data[ticketId]) {
                const receipt = receiptResult.data[ticketId];
                if (receipt.status === 'ok') {
                    console.log('✅ Push DELIVERED successfully to FCM/APNs!');
                } else {
                    console.log('❌ Push FAILED:', receipt.message);
                    console.log('   Details:', JSON.stringify(receipt.details));
                }
            } else {
                console.log('⏳ Receipt not ready yet (try checking again in 15 minutes)');
            }
        } else if (result.data && result.data[0] && result.data[0].status === 'error') {
            console.log('❌ Push FAILED:', result.data[0].message);
            console.log('   Details:', JSON.stringify(result.data[0].details));
        }
    }

    console.log('\n=== TEST COMPLETE ===');
}

testPush().catch(e => console.error('Error:', e));
