const fs = require('fs');
const path = require('path');

// Mock `File` and `FormData` for Node.js environment if needed, or use native fetch if Node 18+
// We will use native fetch which is available in Node 18+ (which the user environment likely has)

const API_URL = 'https://routesnap-backend.lalawgwg99.workers.dev';

async function runTest() {
    console.log('🚀 Starting Backend Limit Verification Test...');
    console.log(`Target API: ${API_URL}`);

    try {
        // 1. Create a Route
        console.log('\n[Step 1] Creating a test route...');
        const createRes = await fetch(`${API_URL}/api/create-route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orders: [
                    { customer: 'Test User 1', address: 'Test Address 1' }
                ],
                createdAt: new Date().toISOString()
            })
        });

        if (!createRes.ok) throw new Error(`Create route failed: ${createRes.status}`);
        const routeData = await createRes.json();
        const routeId = routeData.routeId;
        console.log(`✅ Route created. ID: ${routeId}`);

        // 2. Upload Photos Loop
        console.log('\n[Step 2] Testing Upload Limit (Target: 16)...');

        // Prepare a dummy image (1x1 pixel transparent gif)
        const dummyImage = new Blob([Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')], { type: 'image/gif' });

        let successCount = 0;

        for (let i = 1; i <= 18; i++) {
            process.stdout.write(`   Uploading photo ${i}... `);

            const formData = new FormData();
            formData.append('image', dummyImage, `test-${i}.gif`);
            formData.append('routeId', routeId);
            formData.append('orderIndex', '0'); // Uploading to the first order

            const res = await fetch(`${API_URL}/api/upload-delivery-photo`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (res.ok && data.success) {
                console.log('OK ✅');
                successCount++;
            } else {
                console.log(`FAILED ❌ (Status: ${res.status}, Error: ${data.error})`);
                if (i <= 16) {
                    console.error('   ⚠️ WARNING: Should have succeeded!');
                } else {
                    console.log('   ℹ️ Expected failure (Limit reached).');
                }
            }

            // Small delay to be nice to the server
            await new Promise(r => setTimeout(r, 200));
        }

        console.log(`\n[Result] Successful Uploads: ${successCount}`);

        if (successCount === 16) {
            console.log('🎉 TEST PASSED: Backend correctly accepts 16 photos and rejects the 17th.');
        } else if (successCount === 8) {
            console.error('❌ TEST FAILED: Backend is still limited to 8 photos.');
        } else if (successCount === 6) {
            console.error('❌ TEST FAILED: Backend is still limited to 6 photos.');
        } else {
            console.error(`❌ TEST FAILED: Unexpected success count: ${successCount}`);
        }

    } catch (e) {
        console.error('\n💥 Critical Test Error:', e);
    }
}

runTest();
