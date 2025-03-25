import { Router } from 'express';
import { ChroniclesController } from '../controllers/chronicles.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const chroniclesController = new ChroniclesController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Chronicle routes
router.post('/', chroniclesController.createChronicle.bind(chroniclesController));
router.get('/', chroniclesController.getChronicles.bind(chroniclesController));
router.get('/search', chroniclesController.searchChronicles.bind(chroniclesController));
router.delete('/:id', chroniclesController.deleteChronicle.bind(chroniclesController));

export default router; 