import { QdrantService } from './qdrant.service';
import { GeminiService } from './gemini.service';

export class SearchService {
  private qdrantService: QdrantService;
  private geminiService: GeminiService;

  constructor() {
    this.qdrantService = new QdrantService();
    this.geminiService = new GeminiService();
  }

  async query(question: string, userId: string) {
    try {
      // TODO: Replace with actual embedding generation
      const queryVector = new Array(1536).fill(0);
      
      const searchResults = await this.qdrantService.searchChronicles(queryVector, userId);

      if (searchResults.length === 0) {
        return {
          answer: {
            answer: "I couldn't find any relevant information in your chronicles.",
            question
          },
          relevantChronicles: []
        };
      }

      const answer = await this.geminiService.generateAnswer({
        question,
        context: searchResults.map(result => ({
          title: result.payload.title,
          content: result.payload.content
        }))
      });

      return { answer, relevantChronicles: searchResults };
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }
}