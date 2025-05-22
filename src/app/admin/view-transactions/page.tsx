
"use client";

import { TransactionTable } from "@/components/shared/TransactionTable";
import { allTransactions, mockAccounts } from "@/lib/mock-data"; // Simulating data fetch
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ListChecks, ArrowLeft } from "lucide-react";
import { LoadingLink } from "@/components/shared/LoadingLink"; // Changed import
import { useEffect, useState } from "react";
import type { Transaction } from "@/lib/types";

export default function ViewAllTransactionsPage() {
  // In a real app, this data would be fetched.
  // We add account holder names for better readability
  const [transactionsWithNames, setTransactionsWithNames] = useState<Transaction[]>([]);

  useEffect(() => {
    const processedTransactions = allTransactions.map(tx => {
      const fromAccount = mockAccounts.find(acc => acc.id === tx.fromAccountId);
      const toAccount = mockAccounts.find(acc => acc.id === tx.toAccountId);
      return {
        ...tx,
        fromAccountId: fromAccount ? `${fromAccount.accountHolderName} (${tx.fromAccountId?.slice(0,5)}...)` : tx.fromAccountId || 'N/A',
        toAccountId: toAccount ? `${toAccount.accountHolderName} (${tx.toAccountId?.slice(0,5)}...)` : tx.toAccountId || 'N/A',
      };
    });
    setTransactionsWithNames(processedTransactions);
  }, []);


  return (
    <div className="space-y-6">
      <LoadingLink href="/admin/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Admin Dashboard
      </LoadingLink>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><ListChecks className="text-primary"/> All System Transactions</CardTitle>
          <CardDescription>
            A comprehensive log of all financial activities across user and business accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionTable transactions={transactionsWithNames} caption="All transactions recorded in the system." maxHeight="75vh" />
        </CardContent>
      </Card>
    </div>
  );
}
