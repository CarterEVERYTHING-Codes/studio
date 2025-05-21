
"use server";

import { z } from "zod";
import { generateAccountDetails, type GenerateAccountDetailsInput } from "@/ai/flows/generate-account-details";
import { addMockAccount, mockUsers } from "@/lib/mock-data";
import type { Account, User } from "@/lib/types";

const issueAccountSchema = z.object({
  accountHolderName: z.string().min(2, "Account holder name is required."),
  email: z.string().email("Invalid email address."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  phoneNumber: z.string().optional(),
  initialDeposit: z.number().min(0, "Initial deposit cannot be negative.").default(0),
});

export type IssueAccountFormValues = z.infer<typeof issueAccountSchema>;

interface IssueAccountSuccessReturn {
  success: true;
  message: string;
  details: {
    account: Account;
    username: string;
    passwordForDisplay: string;
  };
}

interface IssueAccountFailureReturn {
  success: false;
  message: string;
  details?: never; 
}

export async function issueNewAccountAction(values: IssueAccountFormValues): Promise<IssueAccountSuccessReturn | IssueAccountFailureReturn> {
  const validation = issueAccountSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
  }

  const { accountHolderName, email, username, password, phoneNumber, initialDeposit } = validation.data;

  // Check if email or username already exists for a user
  if (mockUsers.some(user => user.email === email)) {
    return { success: false, message: "An account with this email already exists." };
  }
  if (mockUsers.some(user => user.username === username)) {
    return { success: false, message: "This username is already taken. Please choose another." };
  }

  try {
    const genAIInput: GenerateAccountDetailsInput = { name: accountHolderName };
    const cardDetails = await generateAccountDetails(genAIInput);

    const newUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newAccountId = `acc-${newUserId}`;

    const newUser: User = {
      id: newUserId,
      username,
      password, // In a real app, HASH this password before storing
      role: "user",
      name: accountHolderName,
      email,
      phoneNumber: phoneNumber || undefined,
    };

    // Add the new user to the mockUsers array
    mockUsers.push(newUser);

    const newAccount: Account = {
      id: newAccountId,
      userId: newUserId,
      accountHolderName,
      email,
      phoneNumber: phoneNumber || undefined,
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

    addMockAccount(newAccount); // This will now only add the account and its transactions

    return { 
      success: true, 
      message: "Account issued successfully!", 
      details: {
        account: newAccount,
        username: newUser.username,
        passwordForDisplay: newUser.password!, // password will be defined here
      }
    };
  } catch (error) {
    console.error("Error issuing new account:", error);
    // Revert user creation if AI details fail (optional, depends on desired atomicity)
    // For this mock, we'll assume if AI fails, we don't proceed.
    // If newUser was pushed before error, it should be removed.
    // const userIndex = mockUsers.findIndex(u => u.id === newUserId);
    // if (userIndex > -1) mockUsers.splice(userIndex, 1);
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
    return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
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

  // addMockAdmin(newAdmin); // Changed to direct push for consistency
  mockUsers.push(newAdmin);
  return { success: true, message: "Admin account created successfully." };
}

// Removed addMockAdmin function as its logic is simple and now directly in addAdminAction
// If addMockAdmin had more complex logic, it would be kept and modified.
