
"use server";

import { z } from "zod";
import { mockUsers, mockAccounts, mockPendingTransfers, allTransactions } from "@/lib/mock-data";
import type { PendingTransfer, Transaction, Account } from "@/lib/types";

// --- Initiate Transfer ---
const initiateTransferSchema = z.object({
  recipientUsername: z.string().min(1, "Recipient username is required."),
  amount: z.number().positive("Transfer amount must be positive."),
  senderUserId: z.string().min(1, "Sender user ID is required."),
});

export type InitiateTransferFormValues = Omit<z.infer<typeof initiateTransferSchema>, 'senderUserId'>;

export async function initiateTransferAction(
  values: z.infer<typeof initiateTransferSchema>
): Promise<{ success: boolean; message: string; transferId?: string }> {
  const validation = initiateTransferSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
  }

  const { recipientUsername, amount, senderUserId } = validation.data;

  const senderUser = mockUsers.find(u => u.id === senderUserId);
  if (!senderUser) {
    return { success: false, message: "Sender user not found." };
  }
  const senderAccount = mockAccounts.find(acc => acc.userId === senderUserId);
  if (!senderAccount) {
    return { success: false, message: "Sender account not found." };
  }

  if (senderAccount.balance < amount) {
    return { success: false, message: "Insufficient funds to initiate transfer." };
  }

  const recipientUser = mockUsers.find(u => u.username === recipientUsername && u.role === 'user');
  if (!recipientUser) {
    return { success: false, message: "Recipient user not found or is not a standard user." };
  }
  if (recipientUser.id === senderUserId) {
      return { success: false, message: "Cannot transfer funds to yourself."};
  }
  const recipientAccount = mockAccounts.find(acc => acc.userId === recipientUser.id);
  if (!recipientAccount) {
    return { success: false, message: "Recipient account not found." };
  }

  const newPendingTransfer: PendingTransfer = {
    id: `ptxn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    senderUserId,
    senderAccountId: senderAccount.id,
    senderName: senderUser.name,
    recipientUserId: recipientUser.id,
    recipientAccountId: recipientAccount.id,
    recipientUsername, // Store for consistency, though ID is primary
    amount,
    status: "pending",
    initiatedDate: new Date().toISOString(),
    notes: `Transfer initiated by ${senderUser.name} to ${recipientUser.name}`
  };

  mockPendingTransfers.push(newPendingTransfer);
  return { success: true, message: `Transfer of $${amount.toFixed(2)} to ${recipientUser.name} initiated. Awaiting their approval.`, transferId: newPendingTransfer.id };
}


// --- Manage Transfer (Approve/Reject) ---
const manageTransferSchema = z.object({
  transferId: z.string().min(1, "Transfer ID is required."),
  actorUserId: z.string().min(1, "Actor user ID is required."), // The user approving/rejecting
});


export async function approveTransferAction(
  values: z.infer<typeof manageTransferSchema>
): Promise<{ success: boolean; message: string }> {
  const validation = manageTransferSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input for approval." };
  }
  const { transferId, actorUserId } = validation.data;

  const pendingTransfer = mockPendingTransfers.find(pt => pt.id === transferId);
  if (!pendingTransfer) {
    return { success: false, message: "Pending transfer not found." };
  }
  if (pendingTransfer.recipientUserId !== actorUserId) {
    return { success: false, message: "You are not authorized to approve this transfer." };
  }
  if (pendingTransfer.status !== "pending") {
    return { success: false, message: `This transfer is already ${pendingTransfer.status}.` };
  }

  const senderAccount = mockAccounts.find(acc => acc.id === pendingTransfer.senderAccountId);
  const recipientAccount = mockAccounts.find(acc => acc.id === pendingTransfer.recipientAccountId);

  if (!senderAccount || !recipientAccount) {
    pendingTransfer.status = "failed";
    pendingTransfer.notes = "Failed: Sender or recipient account missing.";
    pendingTransfer.resolvedDate = new Date().toISOString();
    return { success: false, message: "Error: Sender or recipient account could not be found. Transfer failed." };
  }
  if (senderAccount.balance < pendingTransfer.amount) {
    pendingTransfer.status = "failed";
    pendingTransfer.notes = "Failed: Sender had insufficient funds at time of approval.";
    pendingTransfer.resolvedDate = new Date().toISOString();
    return { success: false, message: "Transfer failed. Sender has insufficient funds." };
  }

  // Perform the transfer
  senderAccount.balance -= pendingTransfer.amount;
  recipientAccount.balance += pendingTransfer.amount;

  const nowISO = new Date().toISOString();
  const senderTransaction: Transaction = {
    id: `txn-s-${transferId}`,
    date: nowISO,
    description: `Transfer to ${pendingTransfer.recipientUsername} (Approved)`,
    amount: -pendingTransfer.amount,
    type: "transfer",
    fromAccountId: senderAccount.id,
    toAccountId: recipientAccount.id,
  };
  senderAccount.transactions.unshift(senderTransaction);
  allTransactions.unshift(senderTransaction);

  const recipientTransaction: Transaction = {
    id: `txn-r-${transferId}`,
    date: nowISO,
    description: `Transfer from ${pendingTransfer.senderName} (Approved)`,
    amount: pendingTransfer.amount,
    type: "transfer", // Could also be 'deposit' from recipient's perspective
    fromAccountId: senderAccount.id,
    toAccountId: recipientAccount.id,
  };
  recipientAccount.transactions.unshift(recipientTransaction);
  allTransactions.unshift(recipientTransaction);

  // Sort all transactions by date again
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  senderAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  recipientAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  pendingTransfer.status = "approved";
  pendingTransfer.resolvedDate = nowISO;
  pendingTransfer.notes = `Transfer approved by ${recipientAccount.accountHolderName}.`;

  return { success: true, message: `Transfer of $${pendingTransfer.amount.toFixed(2)} from ${pendingTransfer.senderName} approved successfully.` };
}

export async function rejectTransferAction(
  values: z.infer<typeof manageTransferSchema>
): Promise<{ success: boolean; message: string }> {
  const validation = manageTransferSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input for rejection." };
  }
  const { transferId, actorUserId } = validation.data;

  const pendingTransfer = mockPendingTransfers.find(pt => pt.id === transferId);
  if (!pendingTransfer) {
    return { success: false, message: "Pending transfer not found." };
  }
  if (pendingTransfer.recipientUserId !== actorUserId) {
    return { success: false, message: "You are not authorized to reject this transfer." };
  }
  if (pendingTransfer.status !== "pending") {
    return { success: false, message: `This transfer is already ${pendingTransfer.status}.` };
  }
  
  const recipientUser = mockUsers.find(u => u.id === actorUserId);

  pendingTransfer.status = "rejected";
  pendingTransfer.resolvedDate = new Date().toISOString();
  pendingTransfer.notes = `Transfer rejected by ${recipientUser?.name || 'recipient'}.`;

  return { success: true, message: "Transfer rejected successfully." };
}
