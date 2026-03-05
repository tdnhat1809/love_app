// Test video upload to VPS directly (no external dependencies)
// Uses undici for multipart upload (built into Node 18+)

const fs = require('fs');
const path = require('path');
const http = require('http');

const VPS_HOST = '129.212.226.229';
const VPS_PORT = 3001;
const VIDEO_DIR = path.join(__dirname, 'test_send_video');

function uploadVideo(filePath) {
    return new Promise((resolve, reject) => {
        const filename = path.basename(filePath);
        const fileData = fs.readFileSync(filePath);
        const sizeMB = (fileData.length / (1024 * 1024)).toFixed(1);
        console.log(`\n📹 Uploading: ${filename} (${sizeMB} MB)...`);

        const boundary = '----FormBoundary' + Date.now();
        const header = Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="video"; filename="${filename}"\r\nContent-Type: video/mp4\r\n\r\n`
        );
        const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
        const body = Buffer.concat([header, fileData, footer]);

        const startTime = Date.now();
        const req = http.request({
            hostname: VPS_HOST,
            port: VPS_PORT,
            path: '/upload-video',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length,
            },
            timeout: 300000,
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                try {
                    const json = JSON.parse(data);
                    if (json.success) {
                        console.log(`   ✅ SUCCESS in ${elapsed}s`);
                        console.log(`   URL: ${json.url}`);
                        resolve(json);
                    } else {
                        console.log(`   ❌ FAILED: ${data}`);
                        resolve(null);
                    }
                } catch (e) {
                    console.log(`   ❌ Parse error: ${data.substring(0, 200)}`);
                    resolve(null);
                }
            });
        });

        req.on('error', (e) => {
            console.log(`   ❌ ERROR: ${e.message}`);
            resolve(null);
        });
        req.on('timeout', () => {
            console.log(`   ❌ TIMEOUT`);
            req.destroy();
            resolve(null);
        });

        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('=== Video Upload Test ===');
    console.log(`VPS: http://${VPS_HOST}:${VPS_PORT}`);

    // Check VPS status
    await new Promise((resolve) => {
        http.get(`http://${VPS_HOST}:${VPS_PORT}/`, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log('VPS Status:', json.status);
                } catch (e) { console.log('VPS Response:', data.substring(0, 100)); }
                resolve();
            });
        }).on('error', (e) => { console.log('❌ VPS unreachable:', e.message); resolve(); });
    });

    // Get video files sorted by size
    const files = fs.readdirSync(VIDEO_DIR)
        .filter(f => f.endsWith('.mp4'))
        .sort((a, b) => fs.statSync(path.join(VIDEO_DIR, a)).size - fs.statSync(path.join(VIDEO_DIR, b)).size);

    console.log(`\nFound ${files.length} videos:`);
    files.forEach(f => {
        const s = (fs.statSync(path.join(VIDEO_DIR, f)).size / 1024 / 1024).toFixed(1);
        console.log(`  - ${f} (${s} MB)`);
    });

    // Upload each
    const results = [];
    for (const file of files) {
        const result = await uploadVideo(path.join(VIDEO_DIR, file));
        results.push({ file, success: !!result, url: result?.url });
    }

    console.log('\n=== Results ===');
    results.forEach(r => {
        console.log(`${r.success ? '✅' : '❌'} ${r.file} → ${r.url || 'FAILED'}`);
    });

    // Verify URLs are accessible
    if (results.some(r => r.success)) {
        console.log('\n=== Verifying accessibility ===');
        for (const r of results.filter(r => r.success)) {
            await new Promise((resolve) => {
                http.get(r.url, (res) => {
                    console.log(`✅ ${r.file} → HTTP ${res.statusCode} (${res.headers['content-type']})`);
                    res.resume();
                    resolve();
                }).on('error', (e) => {
                    console.log(`❌ ${r.file} → ${e.message}`);
                    resolve();
                });
            });
        }
    }
}

main();
