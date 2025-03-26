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
  private isQdrantAvailable: boolean = true;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    });
    this.collectionName = process.env.QDRANT_COLLECTION || 'chronicles';
    
    // Initialize and check availability
    this.initQdrant().catch(err => {
      console.error('Failed to initialize Qdrant:', err);
      this.isQdrantAvailable = false;
    });
  }

  private async initQdrant() {
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
      this.isQdrantAvailable = true;
      return true;
    } catch (error) {
      this.isQdrantAvailable = false;
      console.error('Failed to initialize Qdrant:', error);
      return false;
    }
  }

  async upsertChronicle(chronicle: z.infer<typeof chronicleSchema>, embedding: number[]) {
    // Skip if Qdrant is not available
    if (!this.isQdrantAvailable) {
      console.warn('Skipping Qdrant upsert because Qdrant is not available');
      return { success: false, reason: 'qdrant_unavailable' };
    }

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
      return { success: true };
    } catch (error) {
      console.error('Failed to upsert chronicle in Qdrant:', error);
      this.isQdrantAvailable = false; // Mark as unavailable after error
      return { success: false, reason: 'qdrant_error', error };
    }
  }

  async searchChronicles(query: string, userId: string, limit: number = 5): Promise<QdrantSearchResult[]> {
    // Skip if Qdrant is not available
    if (!this.isQdrantAvailable) {
      throw new Error('Qdrant search is not available');
    }

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
      console.error('Failed to search chronicles in Qdrant:', error);
      this.isQdrantAvailable = false; // Mark as unavailable after error
      throw error;
    }
  }

  async deleteChronicle(id: string) {
    // Skip if Qdrant is not available
    if (!this.isQdrantAvailable) {
      console.warn('Skipping Qdrant delete because Qdrant is not available');
      return { success: false, reason: 'qdrant_unavailable' };
    }

    try {
      await this.client.delete(this.collectionName, {
        points: [id],
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to delete chronicle from Qdrant:', error);
      this.isQdrantAvailable = false; // Mark as unavailable after error
      return { success: false, reason: 'qdrant_error', error };
    }
  }
  
  // Method to check and reset Qdrant availability
  async checkAvailability() {
    if (!this.isQdrantAvailable) {
      // Try to reconnect
      const available = await this.initQdrant().catch(() => false);
      this.isQdrantAvailable = !!available;
    }
    return this.isQdrantAvailable;
  }
}