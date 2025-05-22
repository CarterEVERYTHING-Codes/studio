
export type UserRole = "admin" | "business" | "user";

export interface User {
  id: string;
  username: string;
  password?: string; // Password should ideally be handled securely, not stored directly
  role: UserRole;
  name: string;
  email: string;
  phoneNumber?: string;
}

export interface Account {
  id: string; // Could be user ID or a unique account ID
  userId: string;
  accountHolderName: string;
  email: string;
  phoneNumber?: string;
  cardNumber: string; // Masked for display, full for operations if necessary
  cvv: string;
  expiryDate: string; // MM/YY
  barcode: string; // 8-digit unique
  balance: number;
  transactions: Transaction[];
  isFrozen: boolean; // New: To freeze card purchases
  purchaseLimitPerTransaction?: number; // New: Optional per-transaction purchase limit
  isBarcodeDisabled: boolean; // New: To disable barcode payment functionality
}

export interface Transaction {
  id: string;
  date: string; // ISO string or Date object
  description: string;
  amount: number; // Positive for deposit/income, negative for withdrawal/expense
  type: "deposit" | "withdrawal" | "purchase" | "transfer" | "request_payment"; // Added 'request_payment' for clarity if needed
  fromAccountId?: string;
  toAccountId?: string;
}

export interface AuthenticatedUser extends User {
  // any additional properties for the authenticated user session
}

export type TransferStatus = "pending" | "approved" | "rejected" | "failed" | "cancelled"; // Added cancelled

export interface PendingTransfer {
  id: string;
  // For a standard transfer: senderUserId initiated it, recipientUserId will approve/reject.
  // For a money request: recipientUserId initiated it (they are the requester/payee),
  //                      senderUserId is the one being asked to pay (they will approve/reject the payment).
  senderUserId: string; // The one whose account will be debited if approved.
  senderAccountId: string;
  senderName: string; // Name of the senderUserId.

  recipientUserId: string; // The one whose account will be credited if approved.
  recipientAccountId: string;
  recipientUsername: string; // Username of the recipientUserId.

  amount: number;
  status: TransferStatus;
  initiatedDate: string; // ISO string
  resolvedDate?: string; // ISO string, when approved/rejected/failed/cancelled
  notes?: string; // Optional notes. Can indicate if it's a transfer or a request.
  // type: 'transfer' | 'request'; // Optional: to explicitly differentiate
}

