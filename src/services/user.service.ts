import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
});

export class UserService {
  async getProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Failed to get profile:', error);
      throw error;
    }
  }

  async updateProfile(userId: string, data: z.infer<typeof updateProfileSchema>) {
    try {
      const validatedData = updateProfileSchema.parse(data);

      const user = await prisma.user.update({
        where: { id: userId },
        data: validatedData,
        select: {
          id: true,
          email: true,
          name: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }
} 