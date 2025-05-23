
"use client";
import { LoadingLink } from "@/components/shared/LoadingLink"; 
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { UserCog, ListChecks, Users, CreditCard, Landmark, FileSearch } from "lucide-react";
import { mockAccounts, MAIN_ADMIN_ACCOUNT_ID, MAIN_ADMIN_USER_ID, allTransactions } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import type { Account } from "@/lib/types";


export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [mainAdminAccountBalance, setMainAdminAccountBalance] = useState<number | null>(null);

  useEffect(() => {
    if (user && user.id === MAIN_ADMIN_USER_ID) { 
        const acc = mockAccounts.find(a => a.id === MAIN_ADMIN_ACCOUNT_ID);
        if (acc) {
            setMainAdminAccountBalance(acc.balance);
        }
    }
  }, [user, mockAccounts, allTransactions]); 


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <UserCog className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Admin Dashboard</CardTitle>
          </div>
          <CardDescription>Welcome, {user?.name || "Admin"}! Here you can manage accounts, view transactions, and perform system operations.</CardDescription>
        </CardHeader>
        {user?.id === MAIN_ADMIN_USER_ID && mainAdminAccountBalance !== null && (
             <CardContent>
                <Card className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
                    <CardHeader>
                        <CardTitle className="text-lg text-green-700 dark:text-green-300">Main Admin Account (Fee Collection)</CardTitle>
                        <CardDescription className="text-green-600 dark:text-green-400">
                            This account collects all service fees from transactions. The balance updates as transactions occur.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">Balance: ${mainAdminAccountBalance.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Check "All System Transactions" to see detailed fee records.</p>
                    </CardContent>
                </Card>
            </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardActionCard
          title="Issue New Account"
          description="Set up a new account for a student or staff member, including their login details."
          href="/admin/issue-account"
          icon={<CreditCard className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
        <DashboardActionCard
          title="View All Transactions"
          description="See a complete log of every transaction made on the platform for auditing and review."
          href="/admin/view-transactions"
          icon={<ListChecks className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
         <DashboardActionCard
          title="View System Accounts"
          description="Look up and manage all user, business, and admin accounts in the system."
          href="/admin/view-accounts" 
          icon={<FileSearch className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
        <DashboardActionCard
          title="Manage Funds"
          description="Carefully add or remove funds from any account. This action is powerful and should be used with caution."
          href="/admin/manage-funds"
          icon={<Landmark className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
        {user?.id === MAIN_ADMIN_USER_ID && ( 
            <DashboardActionCard
            title="Add New Admin"
            description="Create new administrator accounts to help manage the platform."
            href="/admin/add-admin"
            icon={<Users className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
            />
        )}
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
    <LoadingLink href={href} passHref className="h-full"> 
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
            <Button variant="outline" className="w-full" tabIndex={-1}> 
                Go to {title.split(' ')[0]}
            </Button>
        </div>
      </Card>
    </LoadingLink>
  );
}
