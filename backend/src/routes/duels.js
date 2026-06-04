import express from 'express';
import { duelsController } from '../controllers/duelsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/challenge', duelsController.challenge);
router.get('/incoming', duelsController.incoming);
router.get('/history', duelsController.history);
router.get('/pending', duelsController.pending);
router.post('/:id/accept', duelsController.accept);
router.post('/:id/decline', duelsController.decline);
router.post('/:id/answer', duelsController.submitAnswers);
router.get('/:id/result', duelsController.result);
router.get('/:id/questions', duelsController.getQuestions);

export default router;
