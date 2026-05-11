
'use server';

/**
 * @fileOverview An AI agent that generates product descriptions for the admin panel.
 *
 * - generateProductDescription - A function that handles the generation process.
 * - GenerateProductDescriptionInput - The input type for the function.
 * - GenerateProductDescriptionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductDescriptionInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  category: z.string().describe('The category of the product.'),
});
export type GenerateProductDescriptionInput = z.infer<
  typeof GenerateProductDescriptionInputSchema
>;

const GenerateProductDescriptionOutputSchema = z.object({
  description: z.string().describe('A detailed and engaging product description.'),
});
export type GenerateProductDescriptionOutput = z.infer<
  typeof GenerateProductDescriptionOutputSchema
>;

/**
 * Generates a detailed product description using AI.
 * Returns the description as a string.
 */
export async function generateProductDescription(
  input: GenerateProductDescriptionInput
): Promise<string> {
  const result = await generateProductDescriptionFlow(input);
  return result.description;
}

const prompt = ai.definePrompt({
  name: 'generateProductDescriptionPrompt',
  input: {schema: GenerateProductDescriptionInputSchema},
  output: {schema: GenerateProductDescriptionOutputSchema},
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
  prompt: `You are an expert copywriter for a high-end beauty brand called 'Flor de Batom'.
Your task is to create an engaging, detailed, and luxurious product description for a new product.

Product Name: {{{productName}}}
Category: {{{category}}}

Write a compelling product description (around 150-200 words) that highlights its benefits, unique features, and evokes a sense of elegance and sophistication, matching the brand's aesthetic. Focus on appealing to a discerning customer interested in beauty and self-care.`,
});

const generateProductDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductDescriptionFlow',
    inputSchema: GenerateProductDescriptionInputSchema,
    outputSchema: GenerateProductDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    if (!output || !output.description) {
      throw new Error('A IA não conseguiu gerar uma descrição para este produto. Por favor, tente novamente ou verifique se o nome do produto é apropriado.');
    }
    
    return output;
  }
);
