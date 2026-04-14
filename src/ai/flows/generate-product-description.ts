
/**
 * @fileOverview An AI agent that generates product descriptions for the admin panel.
 *
 * - generateProductDescription - A function that generates a detailed product description.
 * - GenerateProductDescriptionInput - The input type for the generateProductDescription function.
 * - GenerateProductDescriptionOutput - The return type for the generateProductDescription function.
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

const GenerateProductDescriptionOutputSchema = z
  .string()
  .describe('A detailed product description.');
export type GenerateProductDescriptionOutput = z.infer<
  typeof GenerateProductDescriptionOutputSchema
>;

export async function generateProductDescription(
  input: GenerateProductDescriptionInput
): Promise<GenerateProductDescriptionOutput> {
  // Nota: Em exportação estática (out), fluxos de servidor não funcionam no navegador.
  // Esta função lançará um erro se chamada no ambiente estático.
  try {
    return generateProductDescriptionFlow(input);
  } catch (error) {
    console.error('IA não disponível em modo estático:', error);
    return "A geração por IA requer um servidor ativo. Por favor, preencha a descrição manualmente.";
  }
}

const prompt = ai.definePrompt({
  name: 'generateProductDescriptionPrompt',
  input: {schema: GenerateProductDescriptionInputSchema},
  output: {schema: GenerateProductDescriptionOutputSchema},
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
    return output!;
  }
);
