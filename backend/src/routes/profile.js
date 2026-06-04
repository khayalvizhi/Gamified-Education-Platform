import express from 'express';
import { profileController } from '../controllers/profileController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:userId', profileController.getProfile);
router.put('/:userId', authMiddleware, profileController.updateProfile);
router.get('/:userId/history', profileController.getHistory);

export default router;
