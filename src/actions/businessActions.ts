
"use server";

import { z } from "zod";
import { 
    addMockTransaction, 
    getAccountByCardNumber, 
    getAccountByBarcode, 
    mockAccounts, 
    MAIN_ADMIN_ACCOUNT_ID,
    CAMPUS_STORE_BUSINESS_ACCOUNT_ID, // Assuming business making sale is Campus Store
    mockUsers
} from "@/lib/mock-data";
import type { Transaction, Account } from "@/lib/types";

// Helper function to calculate service fee
const calculateServiceFee = (amount: number): number => {
  const fee = amount <= 50 ? amount * 0.05 : amount * 0.10;
  return parseFloat(fee.toFixed(2)); // Ensure two decimal places
};

const cardPaymentSchema = z.object({
  cardNumber: z.string().min(12, "Card number is too short.").max(19, "Card number is too long."),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry date must be MM/YY."),
  cvv: z.string().min(3, "CVV must be 3-4 digits.").max(4, "CVV must be 3-4 digits."),
  amount: z.number().positive("Amount must be positive."),
  businessUserId: z.string() // ID of the business user performing the transaction
});

const barcodePaymentSchema = z.object({
  purchaseName: z.string().min(1, "Purchase name is required."),
  barcode: z.string().length(8, "Barcode must be 8 digits."),
  cvv: z.string().min(3, "CVV must be 3-4 digits.").max(4, "CVV must be 3-4 digits."),
  amount: z.number().positive("Amount must be positive."),
  businessUserId: z.string()
});

export async function makeCardPaymentAction(values: z.infer<typeof cardPaymentSchema>): Promise<{ success: boolean; message: string; transactionId?: string }> {
  const validation = cardPaymentSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
  }

  const { cardNumber, expiryDate, cvv, amount: purchaseAmount, businessUserId } = validation.data;
  
  const customerAccount = getAccountByCardNumber(cardNumber);
  const businessAccount = mockAccounts.find(acc => acc.userId === businessUserId); // The business's own account
  const mainAdminAccount = mockAccounts.find(acc => acc.id === MAIN_ADMIN_ACCOUNT_ID);

  if (!customerAccount) return { success: false, message: "Customer card not found." };
  if (!businessAccount) return { success: false, message: "Business account not found." };
  if (!mainAdminAccount) return { success: false, message: "Main admin account not found. Cannot process fee." };

  if (customerAccount.expiryDate !== expiryDate || customerAccount.cvv !== cvv) {
    return { success: false, message: "Invalid card details (expiry or CVV)." };
  }

  const serviceFee = calculateServiceFee(purchaseAmount);
  const totalChargeToCustomer = purchaseAmount + serviceFee;

  if (customerAccount.balance < totalChargeToCustomer) {
    return { success: false, message: "Insufficient funds in customer account for purchase and fee." };
  }

  const businessUser = mockUsers.find(u => u.id === businessUserId);
  const businessName = businessUser?.name || "Campus Business";
  const customerName = customerAccount.accountHolderName;

  // 1. Transaction: Customer pays for item + fee (debited from customer, conceptually to business)
  const customerDebitTx: Transaction = {
    id: `txn-cust-${Date.now()}`,
    date: new Date().toISOString(),
    description: `Purchase at ${businessName} ($${purchaseAmount.toFixed(2)}) & Service Fee ($${serviceFee.toFixed(2)})`,
    amount: -totalChargeToCustomer, // Negative for customer
    type: "purchase",
    fromAccountId: customerAccount.id,
    toAccountId: businessAccount.id, // Main recipient of purchase amount
  };
  addMockTransaction(customerDebitTx); // This will debit customer, credit business by totalChargeToCustomer initially.

  // 2. Correction: Transfer purchaseAmount from totalCharge received by business to business's actual earning.
  //    The addMockTransaction credits businessAccount.id with totalChargeToCustomer.
  //    We need to ensure business only gets purchaseAmount. Fee goes to Admin.
  //    This is tricky with current addMockTransaction.
  //    Let's adjust balances manually then add transactions just for record keeping to specific accounts.

  // Explicit balance updates
  customerAccount.balance -= totalChargeToCustomer;
  businessAccount.balance += purchaseAmount;
  mainAdminAccount.balance += serviceFee;

  // Record transactions for each party's ledger
  const tIdBase = Date.now();

  const customerLedgerTx: Transaction = {
    id: `txn-c-${tIdBase}`,
    date: new Date().toISOString(),
    description: `Payment to ${businessName} ($${purchaseAmount.toFixed(2)}) + Fee ($${serviceFee.toFixed(2)})`,
    amount: -totalChargeToCustomer,
    type: "purchase",
    fromAccountId: customerAccount.id, // Self
    toAccountId: businessAccount.id, // Target of funds before fee split
  };
  customerAccount.transactions.unshift(customerLedgerTx);
  allTransactions.unshift(customerLedgerTx);


  const businessLedgerTx: Transaction = {
    id: `txn-b-${tIdBase}`,
    date: new Date().toISOString(),
    description: `Sale to ${customerName} ($${purchaseAmount.toFixed(2)})`,
    amount: purchaseAmount, // Positive for business
    type: "deposit", // Represents income
    fromAccountId: customerAccount.id,
    toAccountId: businessAccount.id, // Self
  };
  businessAccount.transactions.unshift(businessLedgerTx);
  allTransactions.unshift(businessLedgerTx);
  

  const adminFeeLedgerTx: Transaction = {
    id: `txn-a-${tIdBase}`,
    date: new Date().toISOString(),
    description: `Service Fee from ${customerName} (Purchase at ${businessName})`,
    amount: serviceFee, // Positive for admin
    type: "deposit", // Represents income
    fromAccountId: customerAccount.id, // Source of fee
    toAccountId: mainAdminAccount.id, // Self
  };
  mainAdminAccount.transactions.unshift(adminFeeLedgerTx);
  allTransactions.unshift(adminFeeLedgerTx);

  // Sort all transactions by date again
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  customerAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  businessAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  mainAdminAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return { success: true, message: `Card purchase of $${purchaseAmount.toFixed(2)} successful! Fee: $${serviceFee.toFixed(2)}. Total: $${totalChargeToCustomer.toFixed(2)}`, transactionId: customerDebitTx.id };
}

export async function makeBarcodePaymentAction(values: z.infer<typeof barcodePaymentSchema>): Promise<{ success: boolean; message: string; transactionId?: string }>{
  const validation = barcodePaymentSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
  }

  const { purchaseName, barcode, cvv, amount: purchaseAmount, businessUserId } = validation.data;

  const customerAccount = getAccountByBarcode(barcode);
  const businessAccount = mockAccounts.find(acc => acc.userId === businessUserId);
  const mainAdminAccount = mockAccounts.find(acc => acc.id === MAIN_ADMIN_ACCOUNT_ID);
  
  if (!customerAccount) return { success: false, message: "Customer barcode not found." };
  if (!businessAccount) return { success: false, message: "Business account not found." };
  if (!mainAdminAccount) return { success: false, message: "Main admin account not found. Cannot process fee." };

  if (customerAccount.cvv !== cvv) { 
    return { success: false, message: "Invalid CVV for the account linked to this barcode." };
  }

  const serviceFee = calculateServiceFee(purchaseAmount);
  const totalChargeToCustomer = purchaseAmount + serviceFee;

  if (customerAccount.balance < totalChargeToCustomer) {
    return { success: false, message: "Insufficient funds in customer account for purchase and fee." };
  }
  
  const businessUser = mockUsers.find(u => u.id === businessUserId);
  const businessName = businessUser?.name || "Campus Business";
  const customerName = customerAccount.accountHolderName;

  // Explicit balance updates
  customerAccount.balance -= totalChargeToCustomer;
  businessAccount.balance += purchaseAmount;
  mainAdminAccount.balance += serviceFee;

  const tIdBase = Date.now();

  // Record transactions for each party's ledger
  const customerLedgerTx: Transaction = {
    id: `txn-c-${tIdBase}`,
    date: new Date().toISOString(),
    description: `${purchaseName} at ${businessName} ($${purchaseAmount.toFixed(2)}) + Fee ($${serviceFee.toFixed(2)})`,
    amount: -totalChargeToCustomer,
    type: "purchase",
    fromAccountId: customerAccount.id,
    toAccountId: businessAccount.id,
  };
  customerAccount.transactions.unshift(customerLedgerTx);
  allTransactions.unshift(customerLedgerTx);

  const businessLedgerTx: Transaction = {
    id: `txn-b-${tIdBase}`,
    date: new Date().toISOString(),
    description: `Sale: ${purchaseName} to ${customerName} ($${purchaseAmount.toFixed(2)})`,
    amount: purchaseAmount,
    type: "deposit",
    fromAccountId: customerAccount.id,
    toAccountId: businessAccount.id,
  };
  businessAccount.transactions.unshift(businessLedgerTx);
  allTransactions.unshift(businessLedgerTx);

  const adminFeeLedgerTx: Transaction = {
    id: `txn-a-${tIdBase}`,
    date: new Date().toISOString(),
    description: `Service Fee for ${purchaseName} from ${customerName} (at ${businessName})`,
    amount: serviceFee,
    type: "deposit",
    fromAccountId: customerAccount.id,
    toAccountId: mainAdminAccount.id,
  };
  mainAdminAccount.transactions.unshift(adminFeeLedgerTx);
  allTransactions.unshift(adminFeeLedgerTx);

  // Sort all transactions by date again
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  customerAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  businessAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  mainAdminAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { success: true, message: `Barcode purchase of '${purchaseName}' for $${purchaseAmount.toFixed(2)} successful! Fee: $${serviceFee.toFixed(2)}. Total: $${totalChargeToCustomer.toFixed(2)}`, transactionId: customerLedgerTx.id };
}


// This action is now for ADMIN use
const fundManagementSchema = z.object({
    targetAccountId: z.string().min(1, "Target account ID is required."),
    amount: z.number().positive("Amount must be positive."),
    operation: z.enum(["deposit", "withdraw"]),
    adminUserId: z.string() // ID of admin performing the action
});

// This action is now intended for Admins
export async function manageFundsAction(values: z.infer<typeof fundManagementSchema>): Promise<{ success: boolean; message: string; transaction?: Transaction }> {
    const validation = fundManagementSchema.safeParse(values);
    if(!validation.success) {
        return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
    }

    const { targetAccountId, amount, operation, adminUserId } = validation.data;

    const targetAccount = mockAccounts.find(acc => acc.id === targetAccountId);
    if(!targetAccount) {
        return { success: false, message: "Target account not found." };
    }
    
    // Ensure the target is a user account for typical operations
    const targetUser = mockUsers.find(u => u.id === targetAccount.userId);
    if (!targetUser || targetUser.role !== 'user') {
        // For now, let's allow admin to manage any account, but this could be restricted.
        // console.warn(`Admin ${adminUserId} is managing a non-user account: ${targetAccountId}`);
    }


    if(operation === "withdraw" && targetAccount.balance < amount) {
        return { success: false, message: "Insufficient funds in target account for withdrawal." };
    }

    const transactionAmount = operation === "deposit" ? amount : -amount; // amount is positive if deposit *to* target, negative if withdraw *from* target
    
    const description = operation === "deposit" 
        ? `Admin Deposit by ${adminUserId.slice(0,8)}...`
        : `Admin Withdrawal by ${adminUserId.slice(0,8)}...`;

    const newTransaction: Transaction = {
        id: `txn-admin-${Date.now()}`,
        date: new Date().toISOString(),
        description,
        amount: transactionAmount, // This is the amount that will affect the targetAccount's balance
        type: operation,
        // For admin operations, from/to depends on perspective.
        // If depositing TO target, amount is positive for target. from could be 'admin system' or main admin account.
        // If withdrawing FROM target, amount is negative for target. to could be 'admin system' or main admin.
        // Let's make amount signed from the perspective of the target account.
        fromAccountId: operation === "withdraw" ? targetAccountId : MAIN_ADMIN_ACCOUNT_ID, // Money comes from target or from admin
        toAccountId: operation === "deposit" ? targetAccountId : MAIN_ADMIN_ACCOUNT_ID,   // Money goes to target or to admin
    };
    
    // addMockTransaction will update targetAccount.balance by newTransaction.amount
    // and MAIN_ADMIN_ACCOUNT_ID balance by -newTransaction.amount
    addMockTransaction(newTransaction); 

    return { success: true, message: `${operation.charAt(0).toUpperCase() + operation.slice(1)} successful!`, transaction: newTransaction };
}

