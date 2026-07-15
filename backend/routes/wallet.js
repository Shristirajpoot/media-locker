const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get transaction history for current user
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await db.query(
      `SELECT t.*, m.title as media_title 
       FROM transactions t 
       LEFT JOIN media m ON t.reference_id = m.id
       WHERE t.user_id = ? 
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );

    res.json({ transactions });
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ error: 'Database error fetching transactions' });
  }
});

module.exports = router;
