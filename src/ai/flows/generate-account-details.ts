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
  expiry: z.string().describe('A realistic expiry date in MM/YY format, set to one year from account creation.'),
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
- A plausible expiry date in MM/YY format. (The exact expiry will be set to one year from the current date programmatically).
- An 8-digit unique barcode.

Ensure the card number passes the Luhn algorithm.`,
});

const generateAccountDetailsFlow = ai.defineFlow(
  {
    name: 'generateAccountDetailsFlow',
    inputSchema: GenerateAccountDetailsInputSchema,
    outputSchema: GenerateAccountDetailsOutputSchema,
  },
  async input => {
    const { output: generatedOutput } = await generateAccountDetailsPrompt(input);

    if (!generatedOutput) {
      throw new Error('AI prompt did not return an output for account details.');
    }

    // Programmatically set the expiry date to one year from now
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed
    const expiryYear = now.getFullYear() + 1;

    const formattedMonth = currentMonth.toString().padStart(2, '0');
    const formattedYear = expiryYear.toString().slice(-2); // Get last two digits of the year

    // Override the expiry date from the LLM
    generatedOutput.expiry = `${formattedMonth}/${formattedYear}`;

    return generatedOutput;
  }
);
