
"use client";

import { useAuth } from "@/hooks/useAuth";
import { mockAccounts } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import type { Account } from "@/lib/types";
import { TransactionTable } from "@/components/shared/TransactionTable";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DollarSign, ArrowLeft, History, TrendingUp, TrendingDown } from "lucide-react";
import { LoadingLink } from "@/components/shared/LoadingLink"; // Changed import

export default function BusinessManageMoneyPage() {
  const { user } = useAuth();
  const [businessAccount, setBusinessAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const foundAccount = mockAccounts.find(acc => acc.userId === user.id);
      setBusinessAccount(foundAccount || null);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return <div className="text-center py-10">Loading business account information...</div>;
  }

  if (!businessAccount) {
    return (
      <div className="text-center py-10 text-destructive">
        Business account information not found. Please contact support or ensure setup is complete.
      </div>
    );
  }

  const totalIncome = businessAccount.transactions
    .filter(tx => tx.toAccountId === businessAccount.id && tx.amount > 0 && (tx.type === 'deposit' || tx.type === 'transfer')) // Money IN
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalOutflow = businessAccount.transactions
    .filter(tx => tx.fromAccountId === businessAccount.id && tx.amount < 0 && (tx.type === 'withdrawal' || tx.type === 'transfer' || tx.type === 'purchase')) // Money OUT
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);


  // Filter transactions relevant to the business account (where it's either from or to)
  const relevantTransactions = businessAccount.transactions
    .filter(tx => tx.fromAccountId === businessAccount.id || tx.toAccountId === businessAccount.id)
    .map(tx => ({
      ...tx,
      // Adjust amount display if it's for the business perspective
      // If from business, amount is negative. If to business, amount is positive.
      // The `transaction.amount` in `businessAccount.transactions` should already be signed from its perspective.
      // For example, a sale (deposit to business) will have a positive amount.
      amount: tx.toAccountId === businessAccount.id ? tx.amount : (tx.fromAccountId === businessAccount.id ? tx.amount : tx.amount) 
    }))
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <LoadingLink href="/business/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Business Dashboard
      </LoadingLink>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><DollarSign className="text-primary"/> Manage Your Money</CardTitle>
          <CardDescription>
            Overview of your business finances, including balance and transaction history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-8 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Current Business Account Balance</p>
            <p className="text-5xl font-bold text-primary mt-2">
              ${businessAccount.balance.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <Card className="p-4 bg-green-500/10">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center justify-center gap-1"><TrendingUp className="h-4 w-4"/>Total Income (Sales/Deposits)</CardTitle>
                <p className="text-2xl font-semibold text-green-600">${totalIncome.toFixed(2)}</p>
            </Card>
             <Card className="p-4 bg-red-500/10">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center justify-center gap-1"><TrendingDown className="h-4 w-4"/>Total Outflow (Withdrawals/Expenses)</CardTitle>
                <p className="text-2xl font-semibold text-red-600">${totalOutflow.toFixed(2)}</p>
            </Card>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><History /> Business Transaction Log</h3>
             <TransactionTable transactions={relevantTransactions} caption={`Transactions for ${businessAccount.accountHolderName}`} maxHeight="500px"/>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
