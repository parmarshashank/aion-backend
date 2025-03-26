import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const querySchema = z.object({
  question: z.string().min(1),
  context: z.array(z.object({
    title: z.string(),
    content: z.string(),
    tags: z.array(z.string()).optional(),
  })),
});

export class GeminiService {
  private model: any;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is required');
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async generateAnswer({ question, context }: { question: string; context: Array<{ title: string; content: string; tags?: string[] }> }) {
    const prompt = `
      You are a helpful AI assistant. Use the provided context to answer the user's question.
      If the context contains relevant information, provide a detailed answer.
      If you're not sure or the context doesn't contain relevant information, say so clearly.

      Question: ${question}

      Context:
      ${context.map(c => `
      Title: ${c.title}
      Content: ${c.content}
      Tags: ${c.tags?.join(', ') || 'No tags'}
      ---
      `).join('\n')}

      Answer the question based ONLY on the information provided in the context above.
      If you can't find relevant information, say so clearly.
    `;

    try {
      // Generate response
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        answer: text,
        question,
      };
    } catch (error) {
      console.error('Failed to generate answer:', error);
      throw error;
    }
  }
} 