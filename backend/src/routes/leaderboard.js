import express from 'express';
import { db } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const list = await db.leaderboard.getTopUsers(20);
    res.json(list);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
  }
});

export default router;
