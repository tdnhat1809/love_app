// Test FCM push delivery with the new service account key
// 1. Get OAuth2 access token via JWT
// 2. Upload key to Expo via eas-cli
// 3. Send test push via Expo and check receipt
const crypto = require('crypto');
const sa = require('./firebase-service-account.json');

async function getAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claims = Buffer.from(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: sa.token_uri,
        iat: now,
        exp: now + 3600,
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(header + '.' + claims);
    const sig = sign.sign(sa.private_key, 'base64url');
    const jwt = header + '.' + claims + '.' + sig;

    const resp = await fetch(sa.token_uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
    });
    const result = await resp.json();
    return result;
}

async function main() {
    console.log('=== Step 1: Test Service Account Key ===');
    const tokenResult = await getAccessToken();

    if (!tokenResult.access_token) {
        console.log('❌ Failed to get access token:', JSON.stringify(tokenResult));
        process.exit(1);
    }
    console.log('✅ Got OAuth2 access token!');

    // Get push tokens from Firestore
    const { initializeApp } = require('firebase/app');
    const { getFirestore, collection, getDocs } = require('firebase/firestore');
    const app = initializeApp({
        apiKey: 'AIzaSyD1Mj8VpyRaiEbAZ0JoQiVwngJziaLDgkk',
        projectId: 'nhat-love-nhi',
    });
    const db = getFirestore(app);
    const snap = await getDocs(collection(db, 'couples', 'XRRJC9', 'pushTokens'));

    console.log('\n=== Step 2: Send push via Expo Push API (to check receipt after key upload) ===');
    const tokens = [];
    snap.forEach(d => tokens.push(d.data().token));
    console.log('Tokens:', tokens);

    // Send push via Expo
    const pushResp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens.map(t => ({
            to: t,
            title: '🔔 Test Push (key mới)',
            body: 'Nếu thấy = push OK! ' + new Date().toLocaleTimeString(),
            sound: 'default',
            priority: 'high',
            channelId: 'love-messages',
        }))),
    });
    const pushResult = await pushResp.json();
    console.log('Push result:', JSON.stringify(pushResult, null, 2));

    const ticketIds = [];
    if (pushResult.data) {
        pushResult.data.forEach(d => { if (d.id) ticketIds.push(d.id); });
    }

    console.log('\nWaiting 15s for delivery...');
    await new Promise(r => setTimeout(r, 15000));

    console.log('\n=== Step 3: Check receipts ===');
    const receiptResp = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ticketIds }),
    });
    const receipts = await receiptResp.json();
    console.log(JSON.stringify(receipts, null, 2));

    if (receipts.data) {
        for (const [id, r] of Object.entries(receipts.data)) {
            if (r.status === 'ok') console.log(`\n✅ ${id}: DELIVERED!`);
            else console.log(`\n❌ ${id}: ${r.message} (${r.details?.error})`);
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
