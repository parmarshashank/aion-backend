import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

const userService = new UserService();

export class UserController {
  async getProfile(req: Request, res: Response) {
    try {
      const profile = await userService.getProfile(req.user!.id);
      res.json(profile);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const profile = await userService.updateProfile(req.user!.id, req.body);
      res.json(profile);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
} 