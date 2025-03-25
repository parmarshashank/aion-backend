import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// User profile routes
router.get('/profile', userController.getProfile.bind(userController));
router.patch('/profile', userController.updateProfile.bind(userController));

export default router; 