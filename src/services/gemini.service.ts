import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const querySchema = z.object({
  question: z.string().min(1),
  context: z.array(z.object({
    title: z.string(),
    content: z.string(),
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
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateAnswer(data: z.infer<typeof querySchema>) {
    try {
      const validatedData = querySchema.parse(data);

      // Prepare context from chronicles
      const context = validatedData.context
        .map(c => `Title: ${c.title}\nContent: ${c.content}`)
        .join('\n\n');

      // Create prompt
      const prompt = `Based on the following context, please answer the question. If the answer cannot be found in the context, say so.

Context:
${context}

Question: ${validatedData.question}

Answer:`;

      // Generate response
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        answer: text,
        question: validatedData.question,
      };
    } catch (error) {
      console.error('Failed to generate answer:', error);
      throw error;
    }
  }
} 