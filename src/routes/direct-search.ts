import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication middleware
router.use(authenticateToken);

// Direct database search route (when Qdrant is unavailable)
router.post('/direct', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Simple database search
    const chronicles = await prisma.chronicle.findMany({
      where: {
        userId: req.user!.id,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Format results similar to Qdrant results
    const results = chronicles.map(c => ({
      id: c.id,
      score: 1.0,
      payload: {
        title: c.title,
        content: c.content,
        tags: c.tags,
        userId: c.userId,
      },
    }));

    res.json(results);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;