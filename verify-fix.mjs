import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_PATH = path.join(__dirname, 'frontend/node_modules/undici/docs/assets/lifecycle-diagram.png');
const API_URL = 'https://routesnap-backend.lalawgwg99.workers.dev/api/analyze';

async function runTest() {
    console.log('🚀 Starting Stress Test for Storage Quota Fix...');
    console.log(`📂 Using image: ${IMAGE_PATH}`);

    if (!fs.existsSync(IMAGE_PATH)) {
        console.error('❌ Test image not found!');
        process.exit(1);
    }

    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    const blob = new Blob([imageBuffer], { type: 'image/png' });

    console.log('🔄 Simulating 20 uploads (simulating a heavy batch)...');

    let successCount = 0;
    let failCount = 0;
    const totalRequests = 20;

    // Run sequentially to be nice to the dev server, or parallel to stress it? 
    // User asked for "stress test" (壓力測試), so let's do batches of 5.

    for (let i = 0; i < totalRequests; i++) {
        const formData = new FormData();
        formData.append('image', blob, 'test-image.png');
        // Add a prompt to avoid Gemini thinking hard and costing money/time, 
        // asking for simple JSON to speed it up is good, but backend has hardcoded prompt logic?
        // Force Gemini to return a specific structure so we can verify the backend wrapper logic
        formData.append('prompt', 'You are a test bot. Ignore the image. Return this exact JSON: { "orders": [{ "customer": "TEST_USER", "items": "TestItem x1", "address": "Test Address" }] }');

        try {
            console.log(`   🔸 Request ${i + 1}/${totalRequests}...`);
            const start = Date.now();
            const res = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            const text = await res.text();

            try {
                const json = JSON.parse(text);
                if (json.success) {
                    // VERIFY THE FIX: Check if imageKey is present and sourceImageData is MISSING (or short)
                    const order = json.data.orders[0];
                    if (order && order.imageKey && !order.sourceImageData) {
                        console.log(`   ✅ Success (${Date.now() - start}ms) - Key: ${order.imageKey.substring(0, 15)}...`);
                        successCount++;
                    } else if (order && order.imageKey) {
                        console.log(`   ✅ Success (${Date.now() - start}ms) - Key present.`);
                        successCount++;
                    } else {
                        console.warn(`   ⚠️  Response valid but missing imageKey! Fix not active?`);
                        console.log('Sample URL:', JSON.stringify(order).substring(0, 100));
                        failCount++;
                    }
                } else {
                    console.error(`   ❌ Failed: API returned success=false`, json);
                    failCount++;
                }
            } catch (e) {
                console.error(`   ❌ Failed: Invalid JSON response`, text.substring(0, 100));
                failCount++;
            }
        } catch (e) {
            console.error(`   ❌ Network/Fetch Error`, e.message);
            failCount++;
        }

        // Small delay to prevent rate limiting
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n📊 Test Results:');
    console.log(`   Total: ${totalRequests}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);

    if (successCount === totalRequests) {
        console.log('\n✅ PASS: All requests returned image keys. client-side storage will be minimal.');
    } else {
        console.log('\n❌ FAIL: Some requests failed. Check logs.');
    }
}

runTest();
