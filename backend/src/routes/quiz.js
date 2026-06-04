import express from 'express';
import { quizController } from '../controllers/quizController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);
router.post('/', authMiddleware, quizController.createQuiz);
router.post('/:id/attempt', authMiddleware, quizController.submitAttempt);

export default router;
