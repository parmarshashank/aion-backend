import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';

const searchService = new SearchService();

export class SearchController {
  async query(req: Request, res: Response) {
    try {
      const { question } = req.body;
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question is required' });
      }

      const result = await searchService.query(question, req.user!.id);
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
} 