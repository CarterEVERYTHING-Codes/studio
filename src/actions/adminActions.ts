
"use server";

import { z } from "zod";
import { generateAccountDetails, type GenerateAccountDetailsInput } from "@/ai/flows/generate-account-details";
import { addMockAccount, addMockAdmin, mockUsers } from "@/lib/mock-data";
import type { Account, User } from "@/lib/types";

const issueAccountSchema = z.object({
  accountHolderName: z.string().min(2, "Account holder name is required."),
  email: z.string().email("Invalid email address."),
  phoneNumber: z.string().optional(),
  initialDeposit: z.number().min(0, "Initial deposit cannot be negative.").default(0),
});

export type IssueAccountFormValues = z.infer<typeof issueAccountSchema>;

export async function issueNewAccountAction(values: IssueAccountFormValues): Promise<{ success: boolean; message: string; account?: Account }> {
  const validation = issueAccountSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input: " + validation.error.flatten().fieldErrors };
  }

  const { accountHolderName, email, phoneNumber, initialDeposit } = validation.data;

  // Check if email already exists for a user
  if (mockUsers.some(user => user.email === email)) {
    return { success: false, message: "An account with this email already exists." };
  }

  try {
    const genAIInput: GenerateAccountDetailsInput = { name: accountHolderName };
    const cardDetails = await generateAccountDetails(genAIInput);

    const newAccountId = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newAccount: Account = {
      id: newAccountId,
      userId: newUserId, // Link to a new user ID
      accountHolderName,
      email,
      phoneNumber,
      cardNumber: cardDetails.cardNumber,
      cvv: cardDetails.cvv,
      expiryDate: cardDetails.expiry,
      barcode: cardDetails.barcode,
      balance: initialDeposit,
      transactions: initialDeposit > 0 ? [{
        id: `txn-${newAccountId}-init`,
        date: new Date().toISOString(),
        description: "Initial deposit",
        amount: initialDeposit,
        type: "deposit",
        toAccountId: newAccountId,
      }] : [],
    };

    addMockAccount(newAccount); // This also adds a mock user

    return { success: true, message: "Account issued successfully!", account: newAccount };
  } catch (error) {
    console.error("Error issuing new account:", error);
    return { success: false, message: "Failed to generate account details. Please try again." };
  }
}

const addAdminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address."),
});

export type AddAdminFormValues = z.infer<typeof addAdminSchema>;

export async function addAdminAction(values: AddAdminFormValues): Promise<{ success: boolean; message: string; }> {
  const validation = addAdminSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input: " + validation.error.flatten().fieldErrors };
  }
  
  const { username, password, name, email } = validation.data;

  if (mockUsers.some(user => user.username === username || user.email === email)) {
    return { success: false, message: "Username or email already exists." };
  }

  const newAdmin: User = {
    id: `admin-${Date.now()}`,
    username,
    password, // In a real app, hash this password
    role: "admin",
    name,
    email,
  };

  addMockAdmin(newAdmin);
  return { success: true, message: "Admin account created successfully." };
}
