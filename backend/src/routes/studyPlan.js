import express from 'express';
import { studyPlanController } from '../controllers/studyPlanController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/preferences', studyPlanController.savePreferences);
router.get('/preferences', studyPlanController.getPreferences);
router.post('/generate', studyPlanController.generatePlan);
router.get('/active', studyPlanController.getActivePlan);
router.patch('/progress/:progressId', studyPlanController.markProgress);
router.post('/regenerate', studyPlanController.regeneratePlan);

export default router;
