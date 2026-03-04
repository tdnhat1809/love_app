// Send push and check receipt to see WHY it's not delivered
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
    // Get tokens
    const snap = await getDocs(collection(db, 'couples', 'XRRJC9', 'pushTokens'));
    const tokens = [];
    snap.forEach(d => tokens.push(d.data().token));

    console.log('Tokens:', tokens);

    // Send push
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokens.map(t => ({
            to: t,
            title: '🔔 Test Receipt',
            body: 'Testing delivery receipt ' + new Date().toLocaleTimeString(),
            sound: 'default',
            priority: 'high',
            channelId: 'love-messages',
        }))),
    });
    const sendResult = await response.json();
    console.log('\n=== SEND RESULT ===');
    console.log(JSON.stringify(sendResult, null, 2));

    // Collect ticket IDs
    const ticketIds = [];
    if (sendResult.data) {
        sendResult.data.forEach(d => {
            if (d.id) ticketIds.push(d.id);
            if (d.status === 'error') {
                console.log('\n❌ SEND ERROR:', d.message, d.details);
            }
        });
    }

    if (ticketIds.length === 0) {
        console.log('\n❌ No tickets received!');
        process.exit(1);
    }

    console.log('\nTicket IDs:', ticketIds);
    console.log('\nWaiting 15 seconds for delivery...');
    await new Promise(r => setTimeout(r, 15000));

    // Check receipts
    console.log('\n=== CHECKING RECEIPTS ===');
    const receiptResponse = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: ticketIds }),
    });
    const receipts = await receiptResponse.json();
    console.log(JSON.stringify(receipts, null, 2));

    // Analyze
    if (receipts.data) {
        for (const [id, receipt] of Object.entries(receipts.data)) {
            if (receipt.status === 'ok') {
                console.log(`\n✅ Ticket ${id}: DELIVERED to FCM`);
            } else if (receipt.status === 'error') {
                console.log(`\n❌ Ticket ${id}: FAILED`);
                console.log('   Message:', receipt.message);
                console.log('   Details:', JSON.stringify(receipt.details));
            }
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
