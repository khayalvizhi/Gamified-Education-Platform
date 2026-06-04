import express from 'express';
import { battleController } from '../controllers/battleController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/start', authMiddleware, battleController.startBattle);
router.post('/:id/answer', authMiddleware, battleController.submitRoundAnswer);
router.post('/:id/finish', authMiddleware, battleController.finalizeBattle);

export default router;
