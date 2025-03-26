import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { WebScraper } from '../utils/scraper';
import { QdrantService } from './qdrant.service';

const prisma = new PrismaClient();
const webScraper = new WebScraper();
const qdrantService = new QdrantService();

const chronicleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()),
  referenceLinks: z.array(z.string().url()),
  userId: z.string(),
});

export class ChroniclesService {
  async createChronicle(data: z.infer<typeof chronicleSchema>) {
    try {
      const validatedData = chronicleSchema.parse(data);

      let scrapedContent = '';
      if (validatedData.referenceLinks.length > 0) {
        const scrapedContents = await Promise.all(
          validatedData.referenceLinks.map(link => webScraper.scrapeContent(link))
        );
        scrapedContent = scrapedContents.join('\n\n');
      }

      const chronicle = await prisma.chronicle.create({
        data: {
          ...validatedData,
          scrapedContent,
        },
      });

      try {
        const embedding = new Array(1536).fill(0);

        await qdrantService.upsertChronicle(
          {
            id: chronicle.id,
            title: chronicle.title,
            content: `${chronicle.content}\n\nScraped Content:\n${scrapedContent}`,
            userId: chronicle.userId,
          },
          embedding
        );
      } catch (qdrantError) {
        console.error('Failed to store chronicle in Qdrant:', qdrantError);
        throw qdrantError;
      }

      return chronicle;
    } catch (error) {
      console.error('Failed to create chronicle:', error);
      throw error;
    }
  }

  async getChronicles(userId: string) {
    try {
      return await prisma.chronicle.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Failed to get chronicles:', error);
      throw error;
    }
  }

  async searchChronicles(query: string, userId: string) {
    try {
      // TODO: Replace with actual embedding generation
      const queryVector = new Array(1536).fill(0);
      
      try {
        const searchResults = await qdrantService.searchChronicles(queryVector, userId);
        return searchResults;
      } catch (qdrantError) {
        console.error('Qdrant search failed, falling back to database search:', qdrantError);
        
        // Fallback to basic database search
        const chronicles = await prisma.chronicle.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        
        return chronicles.map(c => ({
          id: c.id,
          score: 1.0, 
          payload: {
            title: c.title,
            content: c.content,
            userId: c.userId,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to search chronicles:', error);
      throw error;
    }
  }

  async deleteChronicle(id: string, userId: string) {
    try {
      // Check if chronicle belongs to user
      const chronicle = await prisma.chronicle.findFirst({
        where: { id, userId },
      });

      if (!chronicle) {
        throw new Error('Chronicle not found or unauthorized');
      }

      await prisma.chronicle.delete({
        where: { id },
      });

      try {
        await qdrantService.deleteChronicle(id);
      } catch (qdrantError) {
        console.error('Failed to delete chronicle from Qdrant (continuing anyway):', qdrantError);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete chronicle:', error);
      throw error;
    }
  }
}