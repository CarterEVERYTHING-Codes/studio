
"use server";

import { z } from "zod";
import { mockUsers, mockAccounts, mockPendingTransfers, allTransactions } from "@/lib/mock-data";
import type { PendingTransfer, Transaction, Account } from "@/lib/types";

// --- Initiate Transfer (User A sends to User B, User B approves) ---
const initiateTransferSchema = z.object({
  recipientUsername: z.string().min(1, "Recipient username is required."),
  amount: z.number().positive("Transfer amount must be positive."),
  senderUserId: z.string().min(1, "Sender user ID is required."), // User A
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

  const senderUser = mockUsers.find(u => u.id === senderUserId); // User A
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

  const recipientUser = mockUsers.find(u => u.username === recipientUsername && u.role === 'user'); // User B
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
    senderUserId: senderUser.id, // User A is sender
    senderAccountId: senderAccount.id,
    senderName: senderUser.name,
    recipientUserId: recipientUser.id, // User B is recipient
    recipientAccountId: recipientAccount.id,
    recipientUsername: recipientUser.username,
    amount,
    status: "pending",
    initiatedDate: new Date().toISOString(),
    notes: `Transfer from ${senderUser.name} to ${recipientUser.name}. Recipient to approve.`
  };

  mockPendingTransfers.push(newPendingTransfer);
  return { success: true, message: `Transfer of $${amount.toFixed(2)} to ${recipientUser.name} initiated. Awaiting their approval.`, transferId: newPendingTransfer.id };
}

// --- Initiate Money Request (User A requests from User B, User B approves payment) ---
const initiateMoneyRequestSchema = z.object({
  payerUsername: z.string().min(1, "Payer username is required."), // User B (who will pay)
  amount: z.number().positive("Request amount must be positive."),
  requesterUserId: z.string().min(1, "Requester user ID is required."), // User A (who is requesting)
});

export type InitiateMoneyRequestFormValues = Omit<z.infer<typeof initiateMoneyRequestSchema>, 'requesterUserId'>;

export async function initiateMoneyRequestAction(
  values: z.infer<typeof initiateMoneyRequestSchema>
): Promise<{ success: boolean; message: string; requestId?: string }> {
  const validation = initiateMoneyRequestSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input: " + JSON.stringify(validation.error.flatten().fieldErrors) };
  }
  const { payerUsername, amount, requesterUserId } = validation.data;

  const requesterUser = mockUsers.find(u => u.id === requesterUserId); // User A
  if (!requesterUser) {
    return { success: false, message: "Requester user not found." };
  }
  const requesterAccount = mockAccounts.find(acc => acc.userId === requesterUserId);
  if (!requesterAccount) {
    return { success: false, message: "Requester account not found." };
  }

  const payerUser = mockUsers.find(u => u.username === payerUsername && u.role === 'user'); // User B
  if (!payerUser) {
    return { success: false, message: `User "${payerUsername}" not found or is not a standard user.` };
  }
  if (payerUser.id === requesterUserId) {
    return { success: false, message: "Cannot request money from yourself." };
  }
  const payerAccount = mockAccounts.find(acc => acc.userId === payerUser.id);
  if (!payerAccount) {
    return { success: false, message: "Payer account not found." };
  }

  const newRequest: PendingTransfer = {
    id: `preq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    senderUserId: payerUser.id, // User B (payer) is the 'sender' in terms of funds flow
    senderAccountId: payerAccount.id,
    senderName: payerUser.name, // Payer's name
    recipientUserId: requesterUser.id, // User A (requester) is the 'recipient' of funds
    recipientAccountId: requesterAccount.id,
    recipientUsername: requesterUser.username, // Requester's username
    amount,
    status: "pending",
    initiatedDate: new Date().toISOString(),
    notes: `Money request for $${amount.toFixed(2)} from ${requesterUser.name}. Payer to approve.`
  };
  mockPendingTransfers.push(newRequest);
  return { success: true, message: `Request for $${amount.toFixed(2)} sent to ${payerUser.name}. Awaiting their payment approval.`, requestId: newRequest.id };
}


// --- Manage Transfer/Request (Approve/Reject) ---
// This action is now more generic.
// For an initiated transfer, actorUserId is recipientUserId.
// For a money request, actorUserId is senderUserId (the payer).
const manageTransferSchema = z.object({
  transferId: z.string().min(1, "Transfer ID is required."),
  actorUserId: z.string().min(1, "Actor user ID is required."), // The user approving/rejecting
});


export async function approveTransferAction( // This can be called by recipient of transfer OR payer of request
  values: z.infer<typeof manageTransferSchema>
): Promise<{ success: boolean; message: string }> {
  const validation = manageTransferSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input for approval." };
  }
  const { transferId, actorUserId } = validation.data;

  const pendingTransfer = mockPendingTransfers.find(pt => pt.id === transferId);
  if (!pendingTransfer) {
    return { success: false, message: "Pending transfer/request not found." };
  }

  // Determine if this is approval of a transfer TO actor, or approval of payment FROM actor
  const isActorRecipient = pendingTransfer.recipientUserId === actorUserId; // Actor is receiving funds
  const isActorPayer = pendingTransfer.senderUserId === actorUserId; // Actor is sending funds (paying a request)

  if (!isActorRecipient && !isActorPayer) {
    return { success: false, message: "You are not authorized to approve this item." };
  }
  if (pendingTransfer.status !== "pending") {
    return { success: false, message: `This item is already ${pendingTransfer.status}.` };
  }

  const senderAccount = mockAccounts.find(acc => acc.id === pendingTransfer.senderAccountId); // Account that will be debited
  const recipientAccount = mockAccounts.find(acc => acc.id === pendingTransfer.recipientAccountId); // Account that will be credited

  if (!senderAccount || !recipientAccount) {
    pendingTransfer.status = "failed";
    pendingTransfer.notes = (pendingTransfer.notes || "") + " Failed: Sender or recipient account missing at approval.";
    pendingTransfer.resolvedDate = new Date().toISOString();
    return { success: false, message: "Error: Sender or recipient account could not be found. Action failed." };
  }

  // The senderAccount (source of funds) must have enough balance
  if (senderAccount.balance < pendingTransfer.amount) {
    pendingTransfer.status = "failed";
    pendingTransfer.notes = (pendingTransfer.notes || "") + " Failed: Payer had insufficient funds at time of approval.";
    pendingTransfer.resolvedDate = new Date().toISOString();
    return { success: false, message: "Action failed. Payer has insufficient funds." };
  }

  // Perform the transfer
  senderAccount.balance -= pendingTransfer.amount;
  recipientAccount.balance += pendingTransfer.amount;

  const nowISO = new Date().toISOString();
  const baseDescription = pendingTransfer.notes?.includes("Money request") 
    ? `Payment for request from ${recipientAccount.accountHolderName}` 
    : `Transfer to ${recipientAccount.accountHolderName}`;

  const senderTransaction: Transaction = {
    id: `txn-s-${transferId}`,
    date: nowISO,
    description: `${baseDescription} (Approved by ${isActorPayer ? senderAccount.accountHolderName : recipientAccount.accountHolderName})`,
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
    description: pendingTransfer.notes?.includes("Money request") 
      ? `Payment received for request to ${senderAccount.accountHolderName}`
      : `Transfer received from ${senderAccount.accountHolderName}`,
    amount: pendingTransfer.amount,
    type: "transfer", 
    fromAccountId: senderAccount.id,
    toAccountId: recipientAccount.id,
  };
  recipientAccount.transactions.unshift(recipientTransaction);
  allTransactions.unshift(recipientTransaction);

  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  senderAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  recipientAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  pendingTransfer.status = "approved";
  pendingTransfer.resolvedDate = nowISO;
  pendingTransfer.notes = (pendingTransfer.notes || "") + ` Approved by ${mockUsers.find(u=>u.id===actorUserId)?.name || 'user'}.`;
  
  const successMessage = pendingTransfer.notes?.includes("Money request")
    ? `Payment of $${pendingTransfer.amount.toFixed(2)} to ${recipientAccount.accountHolderName} approved successfully.`
    : `Transfer of $${pendingTransfer.amount.toFixed(2)} from ${senderAccount.accountHolderName} approved successfully.`;

  return { success: true, message: successMessage };
}

export async function rejectTransferAction( // This can be called by recipient of transfer OR payer of request
  values: z.infer<typeof manageTransferSchema>
): Promise<{ success: boolean; message: string }> {
  const validation = manageTransferSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: "Invalid input for rejection." };
  }
  const { transferId, actorUserId } = validation.data;

  const pendingTransfer = mockPendingTransfers.find(pt => pt.id === transferId);
  if (!pendingTransfer) {
    return { success: false, message: "Pending transfer/request not found." };
  }

  const isActorRecipient = pendingTransfer.recipientUserId === actorUserId;
  const isActorPayer = pendingTransfer.senderUserId === actorUserId;

  if (!isActorRecipient && !isActorPayer) {
    return { success: false, message: "You are not authorized to reject this item." };
  }
  if (pendingTransfer.status !== "pending") {
    return { success: false, message: `This item is already ${pendingTransfer.status}.` };
  }
  
  const actorUser = mockUsers.find(u => u.id === actorUserId);

  pendingTransfer.status = "rejected";
  pendingTransfer.resolvedDate = new Date().toISOString();
  pendingTransfer.notes = (pendingTransfer.notes || "") + ` Rejected by ${actorUser?.name || 'user'}.`;

  const successMessage = pendingTransfer.notes?.includes("Money request")
    ? "Payment request rejected successfully."
    : "Transfer rejected successfully.";
  return { success: true, message: successMessage };
}

// Action to cancel a PENDING transfer/request *initiated by the current user*
export async function cancelMyInitiatedItemAction(
  values: z.infer<typeof manageTransferSchema> // transferId, actorUserId (initiator)
): Promise<{ success: boolean; message: string }> {
    const validation = manageTransferSchema.safeParse(values);
    if (!validation.success) {
        return { success: false, message: "Invalid input for cancellation." };
    }
    const { transferId, actorUserId } = validation.data;

    const pendingItem = mockPendingTransfers.find(pt => pt.id === transferId);
    if (!pendingItem) {
        return { success: false, message: "Pending item not found." };
    }

    // For a transfer I initiated, I am senderUserId.
    // For a request I initiated, I am recipientUserId.
    const isMyTransfer = pendingItem.senderUserId === actorUserId && pendingItem.notes?.includes("Transfer from");
    const isMyRequest = pendingItem.recipientUserId === actorUserId && pendingItem.notes?.includes("Money request from");


    if (!isMyTransfer && !isMyRequest) {
        return { success: false, message: "You are not authorized to cancel this item or it's not a cancellable type you initiated." };
    }

    if (pendingItem.status !== "pending") {
        return { success: false, message: `This item is already ${pendingItem.status} and cannot be cancelled.` };
    }

    pendingItem.status = "cancelled";
    pendingItem.resolvedDate = new Date().toISOString();
    pendingItem.notes = (pendingItem.notes || "") + ` Cancelled by initiator ${mockUsers.find(u=>u.id===actorUserId)?.name || 'user'}.`;
    
    const successMessage = isMyTransfer ? "Your initiated transfer has been cancelled." : "Your money request has been cancelled.";
    return { success: true, message: successMessage };
}
