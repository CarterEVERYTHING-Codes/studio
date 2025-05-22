
import type { User, Account, Transaction, UserRole, PendingTransfer } from "@/lib/types";
import type { GenerateAccountDetailsInput } from "@/ai/flows/generate-account-details"; // Ensure this is correctly typed if used here

export const MAIN_ADMIN_USER_ID = "mainAdminUser";
export const MAIN_ADMIN_ACCOUNT_ID = "mainAdminAccount";
export const CAMPUS_STORE_BUSINESS_USER_ID = "business1";
export const CAMPUS_STORE_BUSINESS_ACCOUNT_ID = "business1-acc";


export const mockUsers: User[] = [
  {
    id: "admin1",
    username: "admin",
    password: "password123",
    role: "admin",
    name: "Admin User",
    email: "admin@example.com",
  },
  {
    id: MAIN_ADMIN_USER_ID,
    username: "mainadmin",
    password: "password123",
    role: "admin", // Main Admin still has admin role for access
    name: "Main Admin",
    email: "mainadmin@campusflow.com",
  },
  {
    id: CAMPUS_STORE_BUSINESS_USER_ID,
    username: "business",
    password: "password123",
    role: "business",
    name: "Campus Store",
    email: "store@example.com",
  },
  {
    id: "user1",
    username: "student1",
    password: "password123",
    role: "user",
    name: "Alice Wonderland",
    email: "alice@example.com",
    phoneNumber: "123-456-7890",
  },
  {
    id: "user2",
    username: "student2",
    password: "password123",
    role: "user",
    name: "Bob The Builder",
    email: "bob@example.com",
  },
];

const generateTransactions = (accountId: string, count: number): Transaction[] => {
  const transactions: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    const type = Math.random() > 0.5 ? "purchase" : "deposit";
    const amount = parseFloat((Math.random() * 100 + 5).toFixed(2));
    transactions.push({
      id: `txn-${accountId}-${i + 1}`,
      date: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      description: type === "purchase" ? `Purchase at Vendor ${String.fromCharCode(65 + i)}` : "Pocket Money Deposit",
      amount: type === "purchase" ? -amount : amount, // Signed amount
      type: type,
      fromAccountId: type === "purchase" ? accountId : `source-external-${i}`,
      toAccountId: type === "purchase" ? `vendor-external-${i}` : accountId,
    });
  }
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};


export const mockAccounts: Account[] = [
  {
    id: MAIN_ADMIN_ACCOUNT_ID,
    userId: MAIN_ADMIN_USER_ID,
    accountHolderName: "Main Admin Special Account",
    email: "mainadmin@campusflow.com",
    cardNumber: "4************0000", 
    cvv: "000", 
    expiryDate: "01/99", 
    barcode: "00000000", 
    balance: 0, 
    transactions: [],
    isFrozen: false,
    purchaseLimitPerTransaction: undefined,
    isBarcodeDisabled: false,
  },
  {
    id: CAMPUS_STORE_BUSINESS_ACCOUNT_ID,
    userId: CAMPUS_STORE_BUSINESS_USER_ID,
    accountHolderName: "Campus Store Account",
    email: "store@example.com",
    cardNumber: "5************5555", 
    cvv: "555", 
    expiryDate: "01/99", 
    barcode: "55555555", 
    balance: 1000, 
    transactions: [],
    isFrozen: false,
    purchaseLimitPerTransaction: undefined,
    isBarcodeDisabled: false,
  },
  {
    id: "user1-acc",
    userId: "user1",
    accountHolderName: "Alice Wonderland",
    email: "alice@example.com",
    phoneNumber: "123-456-7890",
    cardNumber: "4************1111",
    cvv: "123",
    expiryDate: "12/25",
    barcode: "11111111",
    balance: 150.75,
    transactions: generateTransactions("user1-acc", 5),
    isFrozen: false,
    purchaseLimitPerTransaction: undefined,
    isBarcodeDisabled: false,
  },
  {
    id: "user2-acc",
    userId: "user2",
    accountHolderName: "Bob The Builder",
    email: "bob@example.com",
    cardNumber: "4************2222",
    cvv: "123",
    expiryDate: "10/26",
    barcode: "12345678",
    balance: 320.00,
    transactions: generateTransactions("user2-acc", 3),
    isFrozen: false,
    purchaseLimitPerTransaction: 50, // Example: Bob has a limit
    isBarcodeDisabled: true,      // Example: Bob has barcode disabled
  },
];

export let allTransactions: Transaction[] = mockAccounts.reduce((acc, curr) => acc.concat(curr.transactions), [] as Transaction[]);

export const mockPendingTransfers: PendingTransfer[] = [
    // Example of a pending transfer for testing
    // {
    //   id: 'ptxn-example-1',
    //   senderUserId: 'user2', // Bob
    //   senderAccountId: 'user2-acc',
    //   senderName: 'Bob The Builder',
    //   recipientUserId: 'user1', // Alice
    //   recipientAccountId: 'user1-acc',
    //   recipientUsername: 'student1',
    //   amount: 20.00,
    //   status: 'pending',
    //   initiatedDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    //   notes: 'For lunch yesterday'
    // }
];

export const addMockAccount = (account: Account): void => {
  mockAccounts.push(account);
  if (account.transactions && account.transactions.length > 0) {
      allTransactions = allTransactions.concat(account.transactions);
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};

// Simplified addMockTransaction - direct balance updates for purchases are handled in businessActions
export const addMockTransaction = (transaction: Transaction): void => {
  allTransactions.unshift(transaction);
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const fromAccount = mockAccounts.find(acc => acc.id === transaction.fromAccountId);
  const toAccount = mockAccounts.find(acc => acc.id === transaction.toAccountId);

  if (fromAccount) {
    fromAccount.balance -= transaction.amount; // Assuming amount is positive for the actual transfer value
    fromAccount.transactions.unshift({...transaction, amount: -transaction.amount});
    fromAccount.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  if (toAccount) {
    toAccount.balance += transaction.amount; // Assuming amount is positive for the actual transfer value
    toAccount.transactions.unshift({...transaction, amount: transaction.amount});
    toAccount.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};


export const getAccountByCardNumber = (cardNumber: string): Account | undefined => {
  return mockAccounts.find(acc => acc.cardNumber === cardNumber);
}

export const getAccountByBarcode = (barcode: string): Account | undefined => {
  return mockAccounts.find(acc => acc.barcode === barcode);
}

export const getAccountByUserId = (userId: string): Account | undefined => {
  return mockAccounts.find(acc => acc.userId === userId);
};

