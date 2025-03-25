import { QdrantClient } from '@qdrant/js-client-rest';
import { z } from 'zod';

const chronicleSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  userId: z.string(),
});

interface QdrantSearchResult {
  id: string;
  score: number;
  payload: {
    title: string;
    content: string;
    tags: string[];
    userId: string;
  };
}

export class QdrantService {
  private client: QdrantClient;
  private collectionName: string;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
    });
    this.collectionName = process.env.QDRANT_COLLECTION || 'chronicles';
  }

  async init() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c: { name: string }) => c.name === this.collectionName
      );

      if (!exists) {
        // Create collection if it doesn't exist
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // Size for OpenAI embeddings
            distance: 'Cosine',
          },
        });
      }
    } catch (error) {
      console.error('Failed to initialize Qdrant:', error);
      throw error;
    }
  }

  async upsertChronicle(chronicle: z.infer<typeof chronicleSchema>, embedding: number[]) {
    try {
      const validatedChronicle = chronicleSchema.parse(chronicle);
      
      await this.client.upsert(this.collectionName, {
        points: [
          {
            id: validatedChronicle.id,
            vector: embedding,
            payload: {
              title: validatedChronicle.title,
              content: validatedChronicle.content,
              tags: validatedChronicle.tags,
              userId: validatedChronicle.userId,
            },
          },
        ],
      });
    } catch (error) {
      console.error('Failed to upsert chronicle:', error);
      throw error;
    }
  }

  async searchChronicles(query: string, userId: string, limit: number = 5): Promise<QdrantSearchResult[]> {
    try {
      // TODO: Implement embedding generation for the query
      // For now, we'll use a placeholder vector
      const queryVector = new Array(1536).fill(0);

      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        filter: {
          must: [
            {
              key: 'userId',
              match: { value: userId },
            },
          ],
        },
        limit,
      });

      return searchResult.map(result => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as QdrantSearchResult['payload'],
      }));
    } catch (error) {
      console.error('Failed to search chronicles:', error);
      throw error;
    }
  }

  async deleteChronicle(id: string) {
    try {
      await this.client.delete(this.collectionName, {
        points: [id],
      });
    } catch (error) {
      console.error('Failed to delete chronicle:', error);
      throw error;
    }
  }
} 