
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
}

export interface Transaction {
  id: string;
  date: string; // ISO string or Date object
  description: string;
  amount: number; // Positive for deposit/income, negative for withdrawal/expense
  type: "deposit" | "withdrawal" | "purchase" | "transfer";
  fromAccountId?: string;
  toAccountId?: string;
}

export interface AuthenticatedUser extends User {
  // any additional properties for the authenticated user session
}

export type TransferStatus = "pending" | "approved" | "rejected" | "failed";

export interface PendingTransfer {
  id: string;
  senderUserId: string;
  senderAccountId: string;
  senderName: string; // For display to recipient
  recipientUserId: string;
  recipientAccountId: string;
  recipientUsername: string; // For lookup during initiation
  amount: number;
  status: TransferStatus;
  initiatedDate: string; // ISO string
  resolvedDate?: string; // ISO string, when approved/rejected
  notes?: string; // Optional notes from sender or system
}
