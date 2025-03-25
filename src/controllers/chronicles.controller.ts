import { Request, Response } from 'express';
import { ChroniclesService } from '../services/chronicles.service';

const chroniclesService = new ChroniclesService();

export class ChroniclesController {
  async createChronicle(req: Request, res: Response) {
    try {
      const chronicle = await chroniclesService.createChronicle({
        ...req.body,
        userId: req.user!.id,
      });
      res.status(201).json(chronicle);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async getChronicles(req: Request, res: Response) {
    try {
      const chronicles = await chroniclesService.getChronicles(req.user!.id);
      res.json(chronicles);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async searchChronicles(req: Request, res: Response) {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const results = await chroniclesService.searchChronicles(query, req.user!.id);
      res.json(results);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async deleteChronicle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await chroniclesService.deleteChronicle(id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
} 