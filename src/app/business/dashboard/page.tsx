
"use client";
import { LoadingLink } from "@/components/shared/LoadingLink"; 
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, ShoppingCart, DollarSign } from "lucide-react"; // Removed unused icons
import { mockAccounts } from "@/lib/mock-data"; // Removed unused CAMPUS_STORE_BUSINESS_ACCOUNT_ID
import { useEffect, useState } from "react";
import type { Account } from "@/lib/types";


export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const [businessAccount, setBusinessAccount] = useState<Account | null>(null);

  useEffect(() => {
    if (user) {
      const foundAccount = mockAccounts.find(acc => acc.userId === user.id);
      setBusinessAccount(foundAccount || null);
    }
  }, [user, mockAccounts]); // Added mockAccounts to dependency array for balance updates

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Business Dashboard</CardTitle>
          </div>
          <CardDescription>Welcome, {user?.name || "Business User"}! Process sales and view your business's financial summary.</CardDescription>
        </CardHeader>
        {businessAccount && (
            <CardContent>
                <div className="bg-primary/10 p-6 rounded-lg">
                    <p className="text-sm text-muted-foreground">Your Current Business Balance</p>
                    <p className="text-4xl font-bold text-primary">
                        ${businessAccount.balance.toFixed(2)}
                    </p>
                </div>
            </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardActionCard
          title="Make Purchase"
          description="Charge customers for goods or services using their card or barcode."
          href="/business/make-purchase"
          icon={<ShoppingCart className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
        <DashboardActionCard
          title="Manage Money"
          description="Review your sales history and see your current business account balance."
          href="/business/manage-money"
          icon={<DollarSign className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
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
