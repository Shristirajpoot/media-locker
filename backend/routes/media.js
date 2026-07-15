const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Configure directories
const storageDir = path.resolve(__dirname, '../storage');
const originalsDir = path.join(storageDir, 'originals');
const previewsDir = path.join(storageDir, 'previews');

// Ensure directories exist
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);
if (!fs.existsSync(originalsDir)) fs.mkdirSync(originalsDir);
if (!fs.existsSync(previewsDir)) fs.mkdirSync(previewsDir);

// Configure Multer for original image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, originalsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'original-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload route
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  const { title, description, price } = req.body;
  const file = req.file;

  if (!title || !price || !file) {
    // Clean up uploaded original file if validation fails
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'Title, unlock price, and an image file are required' });
  }

  const unlockPrice = parseInt(price, 10);
  if (isNaN(unlockPrice) || unlockPrice <= 0) {
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'Unlock price must be a valid positive integer' });
  }

  const originalPath = file.path;
  const previewFilename = 'preview-' + path.basename(file.path);
  const previewPath = path.join(previewsDir, previewFilename);

  try {
    // Load original image, resize it to downscale (reduces size and details), then blur
    const image = await Jimp.read(originalPath);
    await image
      .resize(350, Jimp.AUTO) // downscale first
      .blur(20)             // heavy blur
      .quality(75)          // compression
      .writeAsync(previewPath);

    // Save to Database
    const mediaResult = await db.run(
      `INSERT INTO media (owner_id, title, description, price, original_path, preview_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description || '', unlockPrice, originalPath, previewPath]
    );

    res.status(201).json({
      message: 'Media uploaded and processed successfully',
      media: {
        id: mediaResult.lastID,
        title,
        description,
        price: unlockPrice,
        isLocked: false, // Owner sees it unlocked
        isOwner: true
      }
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    // Clean up files if failed
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);
    res.status(500).json({ error: 'Error processing or storing media' });
  }
});

// Feed route
router.get('/feed', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const feed = await db.query(
      `SELECT m.id, m.owner_id, m.title, m.description, m.price, m.created_at,
              u.username as owner_username,
              (CASE WHEN m.owner_id = ? THEN 1
                    WHEN un.id IS NOT NULL THEN 1
                    ELSE 0 END) as is_unlocked
       FROM media m
       JOIN users u ON m.owner_id = u.id
       LEFT JOIN unlocks un ON m.id = un.media_id AND un.user_id = ?
       ORDER BY m.created_at DESC`,
      [userId, userId]
    );

    // Map rows to clean JSON interface
    const mediaList = feed.map(item => ({
      id: item.id,
      ownerId: item.owner_id,
      ownerUsername: item.owner_username,
      title: item.title,
      description: item.description,
      price: item.price,
      createdAt: item.created_at,
      isLocked: item.is_unlocked === 0,
      isOwner: item.owner_id === userId
    }));

    res.json({ feed: mediaList });
  } catch (err) {
    console.error('Feed query error:', err);
    res.status(500).json({ error: 'Database error retrieving feed' });
  }
});

// Get blurred preview stream
router.get('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const media = await db.get('SELECT preview_path FROM media WHERE id = ?', [req.params.id]);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    if (!fs.existsSync(media.preview_path)) {
      return res.status(404).json({ error: 'Preview file not found' });
    }

    res.sendFile(media.preview_path);
  } catch (err) {
    console.error('Preview stream error:', err);
    res.status(500).json({ error: 'Database error retrieving preview' });
  }
});

// Get original image stream (Security gated)
router.get('/:id/original', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const mediaId = req.params.id;

  try {
    const media = await db.get('SELECT * FROM media WHERE id = ?', [mediaId]);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Authorization check: Is current user the owner?
    const isOwner = media.owner_id === userId;
    
    // Authorization check: Has current user unlocked it?
    const unlocked = await db.get(
      'SELECT id FROM unlocks WHERE user_id = ? AND media_id = ?',
      [userId, mediaId]
    );

    if (!isOwner && !unlocked) {
      return res.status(403).json({ error: 'Access denied: Content is locked. Please unlock first.' });
    }

    if (!fs.existsSync(media.original_path)) {
      return res.status(404).json({ error: 'Original file not found' });
    }

    res.sendFile(media.original_path);
  } catch (err) {
    console.error('Original stream error:', err);
    res.status(500).json({ error: 'Database error retrieving media' });
  }
});

// Unlock media route (Safe wallet transaction)
router.post('/:id/unlock', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const mediaId = req.params.id;

  try {
    // 1. Fetch media details
    const media = await db.get('SELECT * FROM media WHERE id = ?', [mediaId]);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // 2. Prevent purchasing own media
    if (media.owner_id === userId) {
      return res.status(400).json({ error: 'You are the owner of this content' });
    }

    // 3. Start SQL transaction to process purchase atomically
    await db.run('BEGIN TRANSACTION');

    // 4. Check double-unlock
    const existingUnlock = await db.get(
      'SELECT id FROM unlocks WHERE user_id = ? AND media_id = ?',
      [userId, mediaId]
    );
    if (existingUnlock) {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Content is already unlocked' });
    }

    // 5. Check buyer wallet balance
    const buyer = await db.get('SELECT coins FROM users WHERE id = ?', [userId]);
    if (buyer.coins < media.price) {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient coins in your wallet' });
    }

    // 6. Deduct coins from buyer
    await db.run('UPDATE users SET coins = coins - ? WHERE id = ?', [media.price, userId]);

    // 7. Add coins to owner
    await db.run('UPDATE users SET coins = coins + ? WHERE id = ?', [media.price, media.owner_id]);

    // 8. Create unlock entry
    await db.run('INSERT INTO unlocks (user_id, media_id) VALUES (?, ?)', [userId, mediaId]);

    // 9. Record transactions logs
    // Deduct log
    await db.run(
      `INSERT INTO transactions (user_id, amount, type, reference_id) 
       VALUES (?, ?, 'UNLOCK_SPENT', ?)`,
      [userId, -media.price, mediaId]
    );
    // Earn log
    await db.run(
      `INSERT INTO transactions (user_id, amount, type, reference_id) 
       VALUES (?, ?, 'UPLOAD_EARNED', ?)`,
      [media.owner_id, media.price, mediaId]
    );

    // Commit changes
    await db.run('COMMIT');

    res.json({
      message: 'Content unlocked successfully',
      mediaId: media.id,
      price: media.price,
      remainingCoins: buyer.coins - media.price
    });
  } catch (err) {
    console.error('Unlock error:', err);
    try {
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: 'Database transaction error during unlock' });
  }
});

module.exports = router;
