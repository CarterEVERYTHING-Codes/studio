
"use server";

import { z } from "zod";
import { 
    addMockTransaction, 
    getAccountByCardNumber, 
    getAccountByBarcode, 
    mockAccounts, 
    MAIN_ADMIN_ACCOUNT_ID,
    allTransactions, 
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
  const businessAccount = mockAccounts.find(acc => acc.userId === businessUserId); 
  const mainAdminAccount = mockAccounts.find(acc => acc.id === MAIN_ADMIN_ACCOUNT_ID);

  if (!customerAccount) return { success: false, message: "Customer card not found." };
  if (customerAccount.isFrozen) return { success: false, message: "Customer account is frozen. Payment denied." };
  if (customerAccount.purchaseLimitPerTransaction && purchaseAmount > customerAccount.purchaseLimitPerTransaction) {
    return { success: false, message: `Purchase amount ($${purchaseAmount.toFixed(2)}) exceeds customer's per-transaction limit of $${customerAccount.purchaseLimitPerTransaction.toFixed(2)}.` };
  }

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

  customerAccount.balance -= totalChargeToCustomer;
  businessAccount.balance += purchaseAmount;
  mainAdminAccount.balance += serviceFee;

  const tIdBase = Date.now();

  const customerLedgerTx: Transaction = {
    id: `txn-c-${tIdBase}`,
    date: new Date().toISOString(),
    description: `Payment to ${businessName} ($${purchaseAmount.toFixed(2)}) + Fee ($${serviceFee.toFixed(2)})`,
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
    description: `Sale to ${customerName} ($${purchaseAmount.toFixed(2)})`,
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
    description: `Service Fee from ${customerName} (Purchase at ${businessName})`,
    amount: serviceFee, 
    type: "deposit", 
    fromAccountId: customerAccount.id, 
    toAccountId: mainAdminAccount.id, 
  };
  mainAdminAccount.transactions.unshift(adminFeeLedgerTx);
  allTransactions.unshift(adminFeeLedgerTx);

  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  customerAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  businessAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  mainAdminAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return { success: true, message: `Card purchase of $${purchaseAmount.toFixed(2)} successful! Fee: $${serviceFee.toFixed(2)}. Total: $${totalChargeToCustomer.toFixed(2)}`, transactionId: customerLedgerTx.id };
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
  if (customerAccount.isFrozen) return { success: false, message: "Customer account is frozen. Payment denied." };
  if (customerAccount.isBarcodeDisabled) return { success: false, message: "Barcode payments are disabled for this customer account."};
  if (customerAccount.purchaseLimitPerTransaction && purchaseAmount > customerAccount.purchaseLimitPerTransaction) {
    return { success: false, message: `Purchase amount ($${purchaseAmount.toFixed(2)}) exceeds customer's per-transaction limit of $${customerAccount.purchaseLimitPerTransaction.toFixed(2)}.` };
  }

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

  customerAccount.balance -= totalChargeToCustomer;
  businessAccount.balance += purchaseAmount;
  mainAdminAccount.balance += serviceFee;

  const tIdBase = Date.now();

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

  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  customerAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  businessAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  mainAdminAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { success: true, message: `Barcode purchase of '${purchaseName}' for $${purchaseAmount.toFixed(2)} successful! Fee: $${serviceFee.toFixed(2)}. Total: $${totalChargeToCustomer.toFixed(2)}`, transactionId: customerLedgerTx.id };
}


const fundManagementSchema = z.object({
    targetAccountId: z.string().min(1, "Target account ID is required."),
    amount: z.number().positive("Amount must be positive."),
    operation: z.enum(["deposit", "withdraw"]),
    adminUserId: z.string() 
});

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
    
    const targetUser = mockUsers.find(u => u.id === targetAccount.userId);
    if (!targetUser || targetUser.role !== 'user') {
        // console.warn(`Admin ${adminUserId} is managing a non-user account: ${targetAccountId}`);
    }


    if(operation === "withdraw" && targetAccount.balance < amount) {
        return { success: false, message: "Insufficient funds in target account for withdrawal." };
    }

    const transactionAmount = operation === "deposit" ? amount : -amount; 
    
    const description = operation === "deposit" 
        ? `Admin Deposit by ${adminUserId.slice(0,8)}...`
        : `Admin Withdrawal by ${adminUserId.slice(0,8)}...`;

    const mainAdminAcc = mockAccounts.find(acc => acc.id === MAIN_ADMIN_ACCOUNT_ID);
    if(!mainAdminAcc) return {success: false, message: "Main admin account for fund source/destination not found."};

    const newTransactionForTarget: Transaction = {
        id: `txn-admin-target-${Date.now()}`,
        date: new Date().toISOString(),
        description,
        amount: transactionAmount, 
        type: operation,
        fromAccountId: operation === "withdraw" ? targetAccountId : MAIN_ADMIN_ACCOUNT_ID,
        toAccountId: operation === "deposit" ? targetAccountId : MAIN_ADMIN_ACCOUNT_ID,  
    };
    
    targetAccount.balance += transactionAmount;
    targetAccount.transactions.unshift(newTransactionForTarget);
    targetAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    allTransactions.unshift(newTransactionForTarget);


    // If depositing to target, admin account is debited. If withdrawing from target, admin account is credited.
    const adminTransactionAmount = -transactionAmount;
    const adminTransactionDescription = operation === "deposit" 
        ? `Funds transferred to ${targetAccount.accountHolderName}`
        : `Funds received from ${targetAccount.accountHolderName}`;
    
    const newTransactionForAdmin: Transaction = {
        id: `txn-admin-source-${Date.now()}`,
        date: new Date().toISOString(),
        description: adminTransactionDescription,
        amount: adminTransactionAmount,
        type: operation === "deposit" ? "withdrawal" : "deposit", // Opposite for admin account
        fromAccountId: operation === "deposit" ? MAIN_ADMIN_ACCOUNT_ID : targetAccountId,
        toAccountId: operation === "withdraw" ? MAIN_ADMIN_ACCOUNT_ID : targetAccountId,
    };
    mainAdminAcc.balance += adminTransactionAmount;
    mainAdminAcc.transactions.unshift(newTransactionForAdmin);
    mainAdminAcc.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    allTransactions.unshift(newTransactionForAdmin);

    allTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { success: true, message: `${operation.charAt(0).toUpperCase() + operation.slice(1)} of $${amount.toFixed(2)} successful!`, transaction: newTransactionForTarget };
}
