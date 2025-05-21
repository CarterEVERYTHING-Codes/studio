
import type { User, Account, Transaction, UserRole } from "@/lib/types";

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
    id: "business1",
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
      amount: type === "purchase" ? -amount : amount,
      type: type,
      toAccountId: type === "purchase" ? `vendor${i}` : accountId,
      fromAccountId: type === "purchase" ? accountId : `source${i}`,
    });
  }
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};


export const mockAccounts: Account[] = [
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
    cvv: "456",
    expiryDate: "10/26",
    barcode: "22222222",
    balance: 320.00,
    transactions: generateTransactions("user2-acc", 3),
  },
  // Business accounts don't typically have balances in this model, they facilitate transactions
  // Admin accounts don't have card details/balances in this model.
];

export let allTransactions: Transaction[] = mockAccounts.reduce((acc, curr) => acc.concat(curr.transactions), [] as Transaction[]);

// Function to add a new account (simulates DB write)
export const addMockAccount = (account: Account): void => {
  mockUsers.push({
    id: account.userId, // Assuming new user per account for simplicity
    username: account.email.split('@')[0], // Simple username generation
    password: 'password123', // Default password for new accounts
    role: 'user',
    name: account.accountHolderName,
    email: account.email,
    phoneNumber: account.phoneNumber,
  });
  mockAccounts.push(account);
  allTransactions = allTransactions.concat(account.transactions);
};

// Function to add a new admin (simulates DB write)
export const addMockAdmin = (admin: User): void => {
  mockUsers.push(admin);
};

// Function to add a transaction (simulates DB write)
export const addMockTransaction = (transaction: Transaction): void => {
  allTransactions.unshift(transaction); // Add to the beginning

  // Update balances
  if (transaction.fromAccountId) {
    const fromAccount = mockAccounts.find(acc => acc.id === transaction.fromAccountId);
    if (fromAccount) {
      fromAccount.balance -= transaction.amount; // Assuming amount is positive for transfer/purchase
      fromAccount.transactions.unshift(transaction);
    }
  }
  if (transaction.toAccountId) {
    const toAccount = mockAccounts.find(acc => acc.id === transaction.toAccountId);
    if (toAccount) {
      toAccount.balance += transaction.amount;
      // Avoid duplicating transaction if it's already added to fromAccount
      if (transaction.fromAccountId !== transaction.toAccountId) {
         toAccount.transactions.unshift(transaction);
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
