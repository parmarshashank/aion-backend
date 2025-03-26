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

      // Try to index in Qdrant, but don't let it block the chronicle creation
      try {
        // Generate embedding for the chronicle content
        // For now, we'll use a placeholder vector
        const embedding = new Array(1536).fill(0);

        // Store in Qdrant
        const qdrantResult = await qdrantService.upsertChronicle(
          {
            id: chronicle.id,
            title: chronicle.title,
            content: chronicle.content,
            tags: chronicle.tags,
            userId: chronicle.userId,
          },
          embedding
        );
        
        if (!qdrantResult.success) {
          console.warn(`Chronicle created but not indexed in Qdrant: ${qdrantResult.reason}`);
        }
      } catch (qdrantError) {
        console.error('Failed to store chronicle in Qdrant (continuing anyway):', qdrantError);
        // Continue even when Qdrant fails - the chronicle is already in the database
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
      // Try searching in Qdrant first
      try {
        // Check if Qdrant is available
        const isQdrantAvailable = await qdrantService.checkAvailability();
        
        if (isQdrantAvailable) {
          const searchResults = await qdrantService.searchChronicles(query, userId);
          return searchResults;
        } else {
          throw new Error('Qdrant not available');
        }
      } catch (qdrantError) {
        console.error('Qdrant search failed, falling back to database search:', qdrantError);
        
        // Fallback to basic database search
        const chronicles = await prisma.chronicle.findMany({
          where: {
            userId,
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
        return chronicles.map(c => ({
          id: c.id,
          score: 1.0, // Default score for fallback results
          payload: {
            title: c.title,
            content: c.content,
            tags: c.tags,
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

      // Delete from database
      await prisma.chronicle.delete({
        where: { id },
      });

      // Try to delete from Qdrant, but don't let it block the operation
      try {
        await qdrantService.deleteChronicle(id);
      } catch (qdrantError) {
        console.error('Failed to delete chronicle from Qdrant (continuing anyway):', qdrantError);
        // Continue even when Qdrant fails - the chronicle is already deleted from the database
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete chronicle:', error);
      throw error;
    }
  }
}