
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
    cvv: "123",
    expiryDate: "10/26",
    barcode: "12345678",
    balance: 320.00,
    transactions: generateTransactions("user2-acc", 3),
  },
];

export let allTransactions: Transaction[] = mockAccounts.reduce((acc, curr) => acc.concat(curr.transactions), [] as Transaction[]);

// Function to add a new account (simulates DB write)
// The user associated with this account should be added to mockUsers separately by the calling action.
export const addMockAccount = (account: Account): void => {
  mockAccounts.push(account);
  // Add transactions from the new account to the global list
  if (account.transactions && account.transactions.length > 0) {
      // A simple concat might lead to duplicates if transactions can be added from multiple places.
      // For this app, we assume new account transactions are unique.
      allTransactions = allTransactions.concat(account.transactions);
      // Sort all transactions by date after adding new ones (optional, but good for display)
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};

// The addMockAdmin function used to be here, but its logic was simple enough
// to be moved directly into the addAdminAction in adminActions.ts for this change.
// If it were more complex, it would be modified here.

// Function to add a transaction (simulates DB write)
export const addMockTransaction = (transaction: Transaction): void => {
  allTransactions.unshift(transaction); // Add to the beginning for chronological order (newest first)

  // Update balances for relevant accounts
  if (transaction.fromAccountId) {
    const fromAccount = mockAccounts.find(acc => acc.id === transaction.fromAccountId);
    if (fromAccount) {
      // Amount is negative for purchase/withdrawal, so direct addition works.
      // For a transfer, amount would be positive, so fromAccount.balance -= transaction.amount
      if (transaction.type === "purchase" || transaction.type === "withdrawal" || transaction.type === "transfer") {
         // Assuming transaction.amount is negative for these types from the source perspective
         // Or, if amount is always positive, then fromAccount.balance -= transaction.amount;
         fromAccount.balance += transaction.amount; // if amount is already correctly signed for source
      }
      // Add transaction to the account's list if not already there (e.g., for transfers)
      if (!fromAccount.transactions.find(t => t.id === transaction.id)) {
        fromAccount.transactions.unshift(transaction);
      }
    }
  }
  if (transaction.toAccountId) {
    const toAccount = mockAccounts.find(acc => acc.id === transaction.toAccountId);
    if (toAccount) {
      // For deposit/transfer, amount would be positive.
      if (transaction.type === "deposit" || transaction.type === "transfer") {
        // toAccount.balance += transaction.amount; // if amount is positive for destination
        // If transaction.amount from source was negative, then toAccount.balance -= transaction.amount
        // Assuming transaction.amount is positive for the "credit" side.
        // So if tx.amount is +50, fromAcc loses 50, toAcc gains 50.
        // Current logic where addMockTransaction is called:
        // - makeCardPaymentAction: amount is positive, newTransaction.amount = -amount. So fromAccount.balance += (-amount)
        // - makeBarcodePaymentAction: amount is positive, newTransaction.amount = -amount. So fromAccount.balance += (-amount)
        // - manageFundsAction:
        //    - deposit: amount positive, txAmount = amount. toAccount.balance += amount
        //    - withdraw: amount positive, txAmount = -amount. fromAccount.balance += (-amount)
        // This means transaction.amount is already signed correctly for its primary leg.
        // If it's a "purchase" from account X to business Y, tx.amount is -value, tx.fromAccountId=X, tx.toAccountId=Y
        // So account X balance changes by tx.amount. Account Y (if tracked) would get +value.
        // The current mock model for business doesn't track balances for businessId itself in mockAccounts,
        // but for user-to-user it should be correct.

        // Let's refine based on structure:
        // transaction.amount is the value that affects fromAccountId's balance.
        // So if fromAccountId has -50, its balance reduces by 50.
        // toAccountId should then receive +50.
        if(transaction.fromAccountId !== transaction.toAccountId){ // Avoid double effect for self-transfers
             toAccount.balance -= transaction.amount; // If amount for fromAccount is -50, toAccount gets -(-50) = +50.
        }

      }
      // Add transaction to the account's list
      if (!toAccount.transactions.find(t => t.id === transaction.id)) {
        toAccount.transactions.unshift(transaction);
      }
    }
  }
  // Sort account transactions (optional, but good for display)
  mockAccounts.forEach(acc => acc.transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
};


export const getAccountByCardNumber = (cardNumber: string): Account | undefined => {
  return mockAccounts.find(acc => acc.cardNumber === cardNumber);
}

export const getAccountByBarcode = (barcode: string): Account | undefined => {
  return mockAccounts.find(acc => acc.barcode === barcode);
}

