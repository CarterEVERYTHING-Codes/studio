
"use client";

import { useAuth } from "@/hooks/useAuth";
import { mockAccounts } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import type { Account } from "@/lib/types";
import { TransactionTable } from "@/components/shared/TransactionTable";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { History, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UserTransactionsPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const userAccount = mockAccounts.find(acc => acc.userId === user.id);
      if (userAccount) {
        setAccount(userAccount);
      }
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return <div className="text-center py-10">Loading transactions...</div>;
  }

  if (!account) {
    return (
      <div className="text-center py-10 text-destructive">
        Account information not found. Please contact support.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/user/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </Link>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><History className="text-primary"/> Transaction History</CardTitle>
          <CardDescription>
            Review all your past transactions and account activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionTable transactions={account.transactions} caption={`Transactions for ${account.accountHolderName}`} maxHeight="500px"/>
        </CardContent>
      </Card>
    </div>
  );
}
