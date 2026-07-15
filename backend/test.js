const fs = require('fs');
const path = require('path');
const db = require('./db');

// Run tests
async function runTests() {
  console.log('--- Starting Integration Tests ---');
  
  // Clean up database if exists so test is clean
  const dbPath = path.resolve(__dirname, 'storage', 'database.sqlite');
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (e) {
      console.log('Note: Database file could not be deleted (might be locked), using dynamic user names to ensure isolation:', e.message);
    }
  }
  
  // Set test port
  process.env.PORT = '5055';
  process.env.JWT_SECRET = 'test_secret_key_123';
  
  // Import and start server
  require('./server.js');
  
  // Wait 1.5 seconds for DB init and Server start
  await new Promise(r => setTimeout(r, 1500));
  
  const baseUrl = 'http://localhost:5055';
  
  const uniqueId = Date.now();
  const usernameA = `usera_${uniqueId}`;
  const usernameB = `userb_${uniqueId}`;
  
  let tokenA = '';
  let tokenB = '';
  let mediaId = null;
  
  // 1x1 transparent PNG base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const originalPngBuffer = Buffer.from(pngBase64, 'base64');

  try {
    // 1. Register User A
    console.log(`Test 1: Register User A (${usernameA})...`);
    const registerARes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameA, password: 'password123' })
    });
    const registerA = await registerARes.json();
    if (registerARes.status !== 201 || !registerA.token) {
      throw new Error(`Register User A failed: ${JSON.stringify(registerA)}`);
    }
    tokenA = registerA.token;
    console.log('User A registered successfully. Coins:', registerA.user.coins);

    // 2. Register User B
    console.log(`Test 2: Register User B (${usernameB})...`);
    const registerBRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameB, password: 'password123' })
    });
    const registerB = await registerBRes.json();
    if (registerBRes.status !== 201 || !registerB.token) {
      throw new Error(`Register User B failed: ${JSON.stringify(registerB)}`);
    }
    tokenB = registerB.token;
    console.log('User B registered successfully. Coins:', registerB.user.coins);

    // 3. User A Uploads Image
    console.log('Test 3: User A Uploading Media...');
    
    const testImagePath = path.join(__dirname, 'test_mock_image.png');
    fs.writeFileSync(testImagePath, originalPngBuffer);
    
    const formData = new FormData();
    formData.append('title', 'Summer Sunset');
    formData.append('description', 'A beautiful warm sunset by the beach.');
    formData.append('price', '40'); // price is 40 coins
    
    const fileBuffer = fs.readFileSync(testImagePath);
    const imageBlob = new Blob([fileBuffer], { type: 'image/png' });
    formData.append('image', imageBlob, 'test_mock_image.png');
    
    const uploadRes = await fetch(`${baseUrl}/api/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`
      },
      body: formData
    });
    const uploadData = await uploadRes.json();
    if (uploadRes.status !== 201 || !uploadData.media) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
    }
    mediaId = uploadData.media.id;
    console.log('Media uploaded. ID:', mediaId, 'Price:', uploadData.media.price);
    
    // Clean up temporary local test file
    try {
      fs.unlinkSync(testImagePath);
    } catch (_) {}

    // 4. User B requests feed
    console.log('Test 4: User B requesting Feed...');
    const feedRes = await fetch(`${baseUrl}/api/media/feed`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const feedData = await feedRes.json();
    const uploadedItem = feedData.feed.find(item => item.id === mediaId);
    if (!uploadedItem) {
      throw new Error('Uploaded media not found in User B feed');
    }
    if (uploadedItem.isLocked !== true) {
      throw new Error('Uploaded media should be locked for User B');
    }
    console.log('Feed verified: Media is locked for User B');

    // 5. User B attempts download original (Gated Check)
    console.log('Test 5: User B attempting unauthorized download...');
    const downloadOriginalRes = await fetch(`${baseUrl}/api/media/${mediaId}/original`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (downloadOriginalRes.status !== 403) {
      throw new Error(`Expected 403, got ${downloadOriginalRes.status}`);
    }
    console.log('Access denied successfully (403)');

    // 6. User B unlocks Media
    console.log('Test 6: User B unlocking Media...');
    const unlockRes = await fetch(`${baseUrl}/api/media/${mediaId}/unlock`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const unlockData = await unlockRes.json();
    if (unlockRes.status !== 200) {
      throw new Error(`Unlock failed: ${JSON.stringify(unlockData)}`);
    }
    console.log('Unlocked successfully! Remaining Coins User B:', unlockData.remainingCoins);
    
    // 7. Verify User A received the coins, User B lost them
    console.log('Test 7: Verifying balances...');
    const meARes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const meA = await meARes.json();
    
    const meBRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const meB = await meBRes.json();
    
    if (meA.user.coins !== 140) { // 100 + 40
      throw new Error(`Expected User A to have 140 coins, got ${meA.user.coins}`);
    }
    if (meB.user.coins !== 60) { // 100 - 40
      throw new Error(`Expected User B to have 60 coins, got ${meB.user.coins}`);
    }
    console.log('Balances correct: User A = 140, User B = 60');

    // 8. User B downloads original (Authorized Check)
    console.log('Test 8: User B downloading original image (Authorized)...');
    const downloadOriginalRes2 = await fetch(`${baseUrl}/api/media/${mediaId}/original`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (downloadOriginalRes2.status !== 200) {
      throw new Error(`Expected 200, got ${downloadOriginalRes2.status}`);
    }
    
    const downloadedArrayBuffer = await downloadOriginalRes2.arrayBuffer();
    const downloadedBuffer = Buffer.from(downloadedArrayBuffer);
    if (!downloadedBuffer.equals(originalPngBuffer)) {
      throw new Error('Downloaded file content does not match original uploaded content');
    }
    console.log('Original download verified! Match successful.');

    // 9. Fetch Feed again and verify unlocked state
    console.log('Test 9: User B checking feed item unlocked status...');
    const feedRes2 = await fetch(`${baseUrl}/api/media/feed`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const feedData2 = await feedRes2.json();
    const itemB = feedData2.feed.find(item => item.id === mediaId);
    if (itemB.isLocked !== false) {
      throw new Error('Media should now be unlocked in the feed for User B');
    }
    console.log('Feed verified: Media is unlocked for User B');

    // 10. Fetch wallet transactions list
    console.log('Test 10: Fetching User B transactions history...');
    const walletRes = await fetch(`${baseUrl}/api/wallet/transactions`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const walletData = await walletRes.json();
    if (walletData.transactions.length !== 2) { // INITIAL (100) and UNLOCK_SPENT (-40)
      throw new Error(`Expected 2 transactions, got ${walletData.transactions.length}`);
    }
    console.log('Transactions verified:', walletData.transactions.map(t => `${t.type}: ${t.amount}`));

    console.log('\n======================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY! ✅');
    console.log('======================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    console.error(err);
    process.exit(1);
  }
}

runTests();
