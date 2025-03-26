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
      // Get search results from Qdrant (this might throw if Qdrant is unavailable)
      const searchResults = await qdrantService.searchChronicles(question, userId);

      // Process the search results to generate an answer
      return this.processSearchResults(question, userId, searchResults);
    } catch (error) {
      console.error('Failed to query using Qdrant:', error);
      throw error;
    }
  }

  // Fallback query method when Qdrant fails
  async fallbackQuery(question: string, userId: string) {
    try {
      // Perform a basic database search instead
      const chronicles = await prisma.chronicle.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: question, mode: 'insensitive' } },
            { content: { contains: question, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      
      // Format results in a way similar to Qdrant results
      const formattedResults = chronicles.map(c => ({
        id: c.id,
        score: 1.0, // Default score for fallback results
        payload: {
          title: c.title,
          content: c.content,
          tags: c.tags,
          userId: c.userId,
        },
      }));
      
      // Process these results just like we would with Qdrant results
      return this.processSearchResults(question, userId, formattedResults);
    } catch (error) {
      console.error('Failed to process fallback query:', error);
      
      // Last resort fallback - no search, just return a basic response
      return {
        answer: {
          answer: "I'm sorry, but I couldn't search your chronicles due to a technical issue. Please try again later.",
          question
        },
        relevantChronicles: []
      };
    }
  }

  // Common method to process search results and generate an answer
  private async processSearchResults(question: string, userId: string, searchResults: SearchResult[]) {
    try {
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

      // If no valid chronicles were found, return a basic response
      if (validChronicles.length === 0) {
        return {
          answer: {
            answer: "I couldn't find any relevant information in your chronicles to answer this question.",
            question
          },
          relevantChronicles: []
        };
      }

      // Try to generate an answer using Gemini
      try {
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
      } catch (geminiError) {
        console.error('Failed to generate answer with Gemini:', geminiError);
        
        // Fall back to a simpler response with just the chronicles
        return {
          answer: {
            answer: "I found some potentially relevant information but couldn't generate a detailed answer.",
            question
          },
          relevantChronicles: validChronicles,
        };
      }
    } catch (error) {
      console.error('Failed to process search results:', error);
      throw error;
    }
  }
}