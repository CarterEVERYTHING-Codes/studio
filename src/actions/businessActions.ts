
"use server";

import { z } from "zod";
import { addMockTransaction, getAccountByCardNumber, getAccountByBarcode, mockAccounts } from "@/lib/mock-data";
import type { Transaction } from "@/lib/types";

const cardPaymentSchema = z.object({
  cardNumber: z.string().min(12, "Card number is too short.").max(19, "Card number is too long."),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry date must be MM/YY."),
  cvv: z.string().min(3, "CVV must be 3-4 digits.").max(4, "CVV must be 3-4 digits."),
  amount: z.number().positive("Amount must be positive."),
  businessAccountId: z.string() // ID of the business performing the transaction
});

const barcodePaymentSchema = z.object({
  purchaseName: z.string().min(1, "Purchase name is required."),
  barcode: z.string().length(8, "Barcode must be 8 digits."),
  cvv: z.string().min(3, "CVV must be 3-4 digits.").max(4, "CVV must be 3-4 digits."),
  amount: z.number().positive("Amount must be positive."),
  businessAccountId: z.string()
});

export async function makeCardPaymentAction(values: z.infer<typeof cardPaymentSchema>): Promise<{ success: boolean; message: string; transaction?: Transaction }> {
  const validation = cardPaymentSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
  }

  const { cardNumber, expiryDate, cvv, amount, businessAccountId } = validation.data;
  
  const targetAccount = getAccountByCardNumber(cardNumber);

  if (!targetAccount) {
    return { success: false, message: "Card not found." };
  }
  if (targetAccount.expiryDate !== expiryDate || targetAccount.cvv !== cvv) {
    return { success: false, message: "Invalid card details (expiry or CVV)." };
  }
  if (targetAccount.balance < amount) {
    return { success: false, message: "Insufficient funds in the account." };
  }

  const newTransaction: Transaction = {
    id: `txn-${Date.now()}`,
    date: new Date().toISOString(),
    description: `Purchase at Business ID: ${businessAccountId.slice(0,8)}...`, // Retaining generic for card for now
    amount: -amount, // Purchase is a deduction
    type: "purchase",
    fromAccountId: targetAccount.id,
    toAccountId: businessAccountId, 
  };

  addMockTransaction(newTransaction);
  return { success: true, message: "Card purchase successful!", transaction: newTransaction };
}

export async function makeBarcodePaymentAction(values: z.infer<typeof barcodePaymentSchema>): Promise<{ success: boolean; message: string; transaction?: Transaction }> {
  const validation = barcodePaymentSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
  }

  const { purchaseName, barcode, cvv, amount, businessAccountId } = validation.data;

  const targetAccount = getAccountByBarcode(barcode);

  if (!targetAccount) {
    return { success: false, message: "Barcode not found." };
  }
  if (targetAccount.cvv !== cvv) { 
    return { success: false, message: "Invalid CVV for the account linked to this barcode." };
  }
  if (targetAccount.balance < amount) {
    return { success: false, message: "Insufficient funds in the account." };
  }

 const newTransaction: Transaction = {
    id: `txn-${Date.now()}`,
    date: new Date().toISOString(),
    description: `Purchase: ${purchaseName}`, // Using the specific purchase name
    amount: -amount, // Purchase is a deduction
    type: "purchase",
    fromAccountId: targetAccount.id,
    toAccountId: businessAccountId, 
  };

  addMockTransaction(newTransaction);
  return { success: true, message: "Barcode purchase successful!", transaction: newTransaction };
}


const fundManagementSchema = z.object({
    targetAccountId: z.string().min(1, "Target account ID is required."),
    amount: z.number().positive("Amount must be positive."),
    operation: z.enum(["deposit", "withdraw"]),
    businessAccountId: z.string()
});

export async function manageFundsAction(values: z.infer<typeof fundManagementSchema>): Promise<{ success: boolean; message: string; transaction?: Transaction }> {
    const validation = fundManagementSchema.safeParse(values);
    if(!validation.success) {
        return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
    }

    const { targetAccountId, amount, operation, businessAccountId } = validation.data;

    const targetAccount = mockAccounts.find(acc => acc.id === targetAccountId);
    if(!targetAccount) {
        return { success: false, message: "Target account not found." };
    }

    if(operation === "withdraw" && targetAccount.balance < amount) {
        return { success: false, message: "Insufficient funds in target account for withdrawal." };
    }

    const transactionAmount = operation === "deposit" ? amount : -amount;
    const description = operation === "deposit" 
        ? `Deposit from Business (${businessAccountId.slice(0,8)}...)`
        : `Withdrawal by Business (${businessAccountId.slice(0,8)}...)`;

    const newTransaction: Transaction = {
        id: `txn-${Date.now()}`,
        date: new Date().toISOString(),
        description,
        amount: transactionAmount,
        type: operation,
        fromAccountId: operation === "withdraw" ? targetAccountId : businessAccountId, 
        toAccountId: operation === "deposit" ? targetAccountId : businessAccountId, 
    };
    
    addMockTransaction(newTransaction); 

    return { success: true, message: `${operation.charAt(0).toUpperCase() + operation.slice(1)} successful!`, transaction: newTransaction };
}
