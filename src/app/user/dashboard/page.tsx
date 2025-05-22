
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { mockAccounts } from "@/lib/mock-data"; // Simulating data fetch
import { CreditCard, History, Wallet, UserCircle, Send, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import type { Account } from "@/lib/types";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Simulate fetching account data
      const userAccount = mockAccounts.find(acc => acc.userId === user.id);
      if (userAccount) {
        setAccount(userAccount);
      }
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return <div className="text-center py-10">Loading account details...</div>;
  }

  if (!account) {
    return <div className="text-center py-10 text-destructive">Account not found. Please contact support.</div>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <UserCircle className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">User Dashboard</CardTitle>
          </div>
          <CardDescription>Welcome, {user?.name || "User"}! View your account details and activity.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="bg-primary/10 p-6 rounded-lg">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-4xl font-bold text-primary">
                    ${account.balance.toFixed(2)}
                </p>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardActionCard
          title="View Card Info"
          description="Access your digital card number, CVV, expiry, and barcode."
          href="/user/card-info"
          icon={<CreditCard className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
        <DashboardActionCard
          title="View Transactions"
          description="Check your detailed transaction history for all activities."
          href="/user/transactions"
          icon={<History className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
        <DashboardActionCard
          title="View Balance"
          description="See your current account balance and manage your funds."
          href="/user/balance" 
          icon={<Wallet className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
         <DashboardActionCard
          title="Transfer Money"
          description="Send funds to another user's account."
          href="/user/transfer"
          icon={<Send className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
        <DashboardActionCard
          title="Review Incoming Transfers"
          description="Approve or reject pending money transfers from other users."
          href="/user/review-transfers"
          icon={<BellRing className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
      </div>
    </div>
  );
}

interface DashboardActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function DashboardActionCard({ title, description, href, icon }: DashboardActionCardProps) {
  return (
    <Link href={href} passHref>
      <Card className="hover:shadow-xl transition-shadow duration-300 group cursor-pointer h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-center mb-4 bg-primary/10 rounded-full p-4 w-20 h-20 mx-auto">
            {icon}
          </div>
          <CardTitle className="text-center text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground text-center">{description}</p>
        </CardContent>
        <div className="p-6 pt-0 mt-auto">
           <Button variant="outline" className="w-full">
                Go to {title.split(' ')[0]}
            </Button>
        </div>
      </Card>
    </Link>
  );
}
