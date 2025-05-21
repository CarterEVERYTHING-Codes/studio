'use server';

/**
 * @fileOverview Generates realistic but masked card details for new user accounts.
 *
 * - generateAccountDetails - A function that handles the generation of account details.
 * - GenerateAccountDetailsInput - The input type for the generateAccountDetails function.
 * - GenerateAccountDetailsOutput - The return type for the generateAccountDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAccountDetailsInputSchema = z.object({
  name: z.string().describe('The name of the account holder.'),
});
export type GenerateAccountDetailsInput = z.infer<typeof GenerateAccountDetailsInputSchema>;

const GenerateAccountDetailsOutputSchema = z.object({
  cardNumber: z.string().describe('A realistic but masked card number.'),
  cvv: z.string().describe('A realistic CVV code.'),
  expiry: z.string().describe('A realistic expiry date in MM/YY format.'),
  barcode: z.string().describe('An 8-digit unique barcode.'),
});

export type GenerateAccountDetailsOutput = z.infer<typeof GenerateAccountDetailsOutputSchema>;

export async function generateAccountDetails(
  input: GenerateAccountDetailsInput
): Promise<GenerateAccountDetailsOutput> {
  return generateAccountDetailsFlow(input);
}

const generateAccountDetailsPrompt = ai.definePrompt({
  name: 'generateAccountDetailsPrompt',
  input: {schema: GenerateAccountDetailsInputSchema},
  output: {schema: GenerateAccountDetailsOutputSchema},
  prompt: `You are a banking system. Generate realistic, but masked, card details for the following account holder:

Name: {{{name}}}

Include:
- A card number that is masked except for the last 4 digits. Start with a leading 4 for Visa.
- A CVV code.
- An expiry date in MM/YY format, expiring one year from now.
- An 8-digit unique barcode.

Ensure the card number passes the Luhn algorithm. Use the current year when calculating the expiry date.`,
});

const generateAccountDetailsFlow = ai.defineFlow(
  {
    name: 'generateAccountDetailsFlow',
    inputSchema: GenerateAccountDetailsInputSchema,
    outputSchema: GenerateAccountDetailsOutputSchema,
  },
  async input => {
    const {output} = await generateAccountDetailsPrompt(input);
    return output!;
  }
);
