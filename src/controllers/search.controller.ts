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

      try {
        const result = await searchService.query(question, req.user!.id);
        res.json(result);
      } catch (error) {
        // Handle the case where search might fail due to Qdrant issues
        if (error instanceof Error && 
            (error.message.includes('Qdrant') || error.message.includes('search'))) {
          console.error('Search error, trying fallback:', error);
          
          // Fallback to direct database query
          const fallbackResult = await searchService.fallbackQuery(question, req.user!.id);
          res.json(fallbackResult);
        } else {
          throw error; // Re-throw if it's not a Qdrant-related error
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}