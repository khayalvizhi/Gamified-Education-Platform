import express from 'express';
import { shopController } from '../controllers/shopController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/avatars', shopController.listAvatars);
router.get('/my-avatars', shopController.myAvatars);
router.post('/buy', shopController.buyAvatar);
router.post('/equip', shopController.equipAvatar);
router.post('/name', shopController.nameAvatar);

export default router;
