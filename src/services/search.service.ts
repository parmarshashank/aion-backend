import { QdrantService } from './qdrant.service';
import { GeminiService } from './gemini.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const qdrantService = new QdrantService();
const geminiService = new GeminiService();

interface SearchResult {
  id: string;
  score: number;
  payload: {
    title: string;
    content: string;
    tags: string[];
    userId: string;
  };
}

export class SearchService {
  async query(question: string, userId: string) {
    try {
      // Search for relevant chronicles
      const searchResults = await qdrantService.searchChronicles(question, userId);

      // Get full chronicle details from database
      const chronicles = await Promise.all(
        searchResults.map(async (result) => {
          const chronicle = await prisma.chronicle.findUnique({
            where: { id: result.id },
          });
          return chronicle;
        })
      );

      // Filter out any null results and prepare context
      const validChronicles = chronicles.filter((c): c is NonNullable<typeof c> => c !== null);

      // Generate answer using Gemini
      const answer = await geminiService.generateAnswer({
        question,
        context: validChronicles.map((c) => ({
          title: c.title,
          content: c.content,
        })),
      });

      return {
        answer,
        relevantChronicles: validChronicles,
      };
    } catch (error) {
      console.error('Failed to process query:', error);
      throw error;
    }
  }
} 