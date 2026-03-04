const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const c = fs.readFileSync('./src/firebase/config.js', 'utf8');
const cfg = {
    apiKey: c.match(/apiKey:\s*'(.+?)'/)?.[1],
    authDomain: c.match(/authDomain:\s*'(.+?)'/)?.[1],
    projectId: c.match(/projectId:\s*'(.+?)'/)?.[1],
    appId: c.match(/appId:\s*'(.+?)'/)?.[1],
};

(async () => {
    const app = initializeApp(cfg, 'check_' + Date.now());
    const db = getFirestore(app);

    console.log('Searching for couple code containing "9c8wsw" or "9C8WSW"...\n');

    // List ALL couples
    const snap = await getDocs(collection(db, 'couples'));
    let found = false;
    for (const d of snap.docs) {
        const code = d.id;
        const data = d.data();
        // Check if matches (case insensitive)
        if (code.toLowerCase().includes('9c8wsw') || code.toUpperCase().includes('9C8WSW') || true) {
            console.log(`Couple: ${code}`);
            console.log(`  Data: ${JSON.stringify(data)}`);

            // Check tokens
            const ts = await getDocs(collection(db, 'couples', code, 'pushTokens'));
            if (ts.empty) {
                console.log(`  ❌ Push Tokens: NONE`);
            } else {
                ts.forEach(t => {
                    const td = t.data();
                    console.log(`  ✅ Token: ${td.token}`);
                    console.log(`    DeviceId: ${td.deviceId}`);
                });
                found = true;
            }
            console.log('');
        }
    }

    if (!found) console.log('❌ No push tokens found in ANY couple!');
    process.exit(0);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
