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

      // Scrape content from reference links
      let scrapedContent = '';
      if (validatedData.referenceLinks.length > 0) {
        const scrapedContents = await Promise.all(
          validatedData.referenceLinks.map(link => webScraper.scrapeContent(link))
        );
        scrapedContent = scrapedContents.join('\n\n');
      }

      // Create chronicle in database
      const chronicle = await prisma.chronicle.create({
        data: {
          ...validatedData,
          scrapedContent,
        },
      });

      // TODO: Generate embedding for the chronicle content
      // For now, we'll use a placeholder vector
      const embedding = new Array(1536).fill(0);

      // Store in Qdrant
      await qdrantService.upsertChronicle(
        {
          id: chronicle.id,
          title: chronicle.title,
          content: chronicle.content,
          tags: chronicle.tags,
          userId: chronicle.userId,
        },
        embedding
      );

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
      const searchResults = await qdrantService.searchChronicles(query, userId);
      return searchResults;
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

      // Delete from database
      await prisma.chronicle.delete({
        where: { id },
      });

      // Delete from Qdrant
      await qdrantService.deleteChronicle(id);

      return { success: true };
    } catch (error) {
      console.error('Failed to delete chronicle:', error);
      throw error;
    }
  }
} 