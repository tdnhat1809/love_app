// Automated FCM V1 credential upload for Expo
// Uses spawn to interact with eas-cli credentials

const { spawn } = require('child_process');
const path = require('path');

const SA_KEY_PATH = path.join(__dirname, 'firebase-service-account.json');

console.log('Starting eas credentials...');
console.log('SA Key:', SA_KEY_PATH);

const proc = spawn('npx', ['-y', 'eas-cli', 'credentials', '-p', 'android'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
});

let output = '';
let step = 0;

function sendKey(key, delay = 500) {
    setTimeout(() => proc.stdin.write(key), delay);
}

proc.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text);

    // Step 1: Select build profile (preview)
    if (text.includes('Which build profile') && step === 0) {
        step = 1;
        console.log('\n>>> Selecting preview...');
        sendKey('\n', 1000); // Enter for first option (preview)
    }

    // Step 2: Select "Push Notifications (FCM V1)"
    if (text.includes('What do you want to do') && step === 1) {
        step = 2;
        console.log('\n>>> Navigating to Push Notifications FCM V1...');
        // Need to navigate down to find FCM V1 option
        // Options order: Keystore, Push Notifications (FCM V1), Push Notifications (Legacy), credentials.json, Go back, Exit
        setTimeout(() => {
            proc.stdin.write('\x1B[B'); // Down arrow 1 - FCM V1
            setTimeout(() => proc.stdin.write('\n'), 500); // Enter
        }, 1000);
    }

    // Step 3: Select upload action
    if (text.includes('Select the Google Service Account Key') && step === 2) {
        step = 3;
        console.log('\n>>> Selecting upload option...');
        // Look for "Upload" option
        setTimeout(() => {
            proc.stdin.write('\x1B[B'); // Down to Upload
            setTimeout(() => proc.stdin.write('\n'), 500);
        }, 1000);
    }

    // Step 3 alt: "What do you want to do" for FCM V1 management
    if ((text.includes('Upload a Google Service Account Key') || text.includes('Set up a Google Service Account Key')) && step >= 2) {
        step = 3;
        console.log('\n>>> Found upload option, selecting...');
        setTimeout(() => proc.stdin.write('\n'), 1000);
    }

    // Step 4: Enter file path
    if (text.includes('Path to Google Service Account') && step >= 2) {
        step = 4;
        console.log('\n>>> Entering SA key path...');
        setTimeout(() => {
            proc.stdin.write(SA_KEY_PATH + '\n');
        }, 1000);
    }

    // Step 5: Confirm
    if (text.includes('confirm') || text.includes('Are you sure')) {
        console.log('\n>>> Confirming...');
        setTimeout(() => proc.stdin.write('y\n'), 500);
    }

    // Success
    if (text.includes('successfully') || text.includes('uploaded')) {
        console.log('\n\n✅ FCM V1 credentials uploaded successfully!');
    }
});

proc.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
});

proc.on('close', (code) => {
    console.log('\nProcess exited with code:', code);
});

// Timeout after 60 seconds
setTimeout(() => {
    console.log('\nTimeout reached, killing process...');
    proc.kill();
}, 60000);
