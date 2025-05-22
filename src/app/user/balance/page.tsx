
"use client";

import { useAuth } from "@/hooks/useAuth";
import { mockAccounts } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import type { Account } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { LoadingLink } from "@/components/shared/LoadingLink"; // Changed import
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { format } from "date-fns";

export default function UserBalancePage() {
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
    return <div className="text-center py-10">Loading balance information...</div>;
  }

  if (!account) {
    return (
      <div className="text-center py-10 text-destructive">
        Account information not found. Please contact support.
      </div>
    );
  }

  // Prepare data for a simple chart (last 5 transactions)
  const chartData = account.transactions.slice(0, 5).reverse().map(tx => ({
      date: format(new Date(tx.date), "MMM d"),
      amount: tx.amount,
      type: tx.type
  }));

  const chartConfig = {
    amount: {
      label: "Amount",
      color: "hsl(var(--primary))",
    },
  } satisfies import("@/components/ui/chart").ChartConfig;

  const totalIncome = account.transactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = account.transactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);


  return (
    <div className="space-y-6">
      <LoadingLink href="/user/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </LoadingLink>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><Wallet className="text-primary"/> Account Balance</CardTitle>
          <CardDescription>
            Your current financial standing and recent activity overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-8 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Current Available Balance</p>
            <p className="text-5xl font-bold text-primary mt-2">
              ${account.balance.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <Card className="p-4 bg-green-500/10">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center justify-center gap-1"><TrendingUp className="h-4 w-4"/>Total Income</CardTitle>
                <p className="text-2xl font-semibold text-green-600">${totalIncome.toFixed(2)}</p>
            </Card>
             <Card className="p-4 bg-red-500/10">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center justify-center gap-1"><TrendingDown className="h-4 w-4"/>Total Expenses</CardTitle>
                <p className="text-2xl font-semibold text-red-600">${totalExpenses.toFixed(2)}</p>
            </Card>
          </div>
          
          {chartData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-center">Recent Transaction Amounts</h3>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} width={50} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="amount" radius={4}>
                    {chartData.map((entry, index) => (
                        <svg key={`cell-${index}`} x={0} y={0}> {/* Recharts expects Cell here, but we use fill in Bar for simplicity */}
                          <rect fill={entry.amount >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                        </svg>
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
