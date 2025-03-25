import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const searchController = new SearchController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Search routes
router.post('/query', searchController.query.bind(searchController));

export default router; 