
import type { User, Account, Transaction, UserRole } from "@/lib/types";

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
      // For these generic transactions, from/to might be less specific
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
    cardNumber: "4************0000", // Placeholder
    cvv: "000", // Placeholder
    expiryDate: "01/99", // Placeholder
    barcode: "00000000", // Placeholder
    balance: 0, // Starts with 0, accumulates fees
    transactions: [],
  },
  {
    id: CAMPUS_STORE_BUSINESS_ACCOUNT_ID,
    userId: CAMPUS_STORE_BUSINESS_USER_ID,
    accountHolderName: "Campus Store Account",
    email: "store@example.com",
    cardNumber: "5************5555", // Placeholder for business card if needed
    cvv: "555", // Placeholder
    expiryDate: "01/99", // Placeholder
    barcode: "55555555", // Placeholder for business barcode if needed
    balance: 1000, // Initial float for the business
    transactions: [],
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
  },
];

export let allTransactions: Transaction[] = mockAccounts.reduce((acc, curr) => acc.concat(curr.transactions), [] as Transaction[]);

export const addMockAccount = (account: Account): void => {
  mockAccounts.push(account);
  if (account.transactions && account.transactions.length > 0) {
      allTransactions = allTransactions.concat(account.transactions);
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};

// This function now correctly handles updating balances for from/to accounts
// based on the signed transaction.amount.
// transaction.amount is the change for fromAccountId.
// toAccountId receives -transaction.amount.
export const addMockTransaction = (transaction: Transaction): void => {
  allTransactions.unshift(transaction); // Add to global list

  // Update From Account
  if (transaction.fromAccountId) {
    const fromAccount = mockAccounts.find(acc => acc.id === transaction.fromAccountId);
    if (fromAccount) {
      fromAccount.balance += transaction.amount; // transaction.amount is already signed for the 'from' side
      fromAccount.transactions.unshift(transaction);
      fromAccount.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }

  // Update To Account
  if (transaction.toAccountId) {
    const toAccount = mockAccounts.find(acc => acc.id === transaction.toAccountId);
    if (toAccount) {
      // If it's a transfer to another tracked account, their balance increases by the positive value
      // (or decreases if the original transaction.amount was positive, which means a debit from 'toAccount')
      toAccount.balance -= transaction.amount; // if amount is -50 for fromAcc, toAcc gets -(-50) = +50
      
      // Create a corresponding transaction for the 'to' account if it's a different party for their records
      // However, for simplicity, we often show the same transaction from multiple perspectives.
      // Let's ensure the transaction is in the toAccount's list as well.
      if (!toAccount.transactions.find(t => t.id === transaction.id && t.fromAccountId === transaction.fromAccountId && t.toAccountId === transaction.toAccountId)) {
         // We might want a slightly different transaction object for the receiver's perspective
         // For now, let's add the same one, implies shared visibility or a simplified model.
         toAccount.transactions.unshift({...transaction}); // Add a copy
         toAccount.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    }
  }
};


export const getAccountByCardNumber = (cardNumber: string): Account | undefined => {
  return mockAccounts.find(acc => acc.cardNumber === cardNumber);
}

export const getAccountByBarcode = (barcode: string): Account | undefined => {
  return mockAccounts.find(acc => acc.barcode === barcode);
}
