
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, ShoppingCart, Landmark, Users } from "lucide-react";

export default function BusinessDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Business Dashboard</CardTitle>
          </div>
          <CardDescription>Welcome, {user?.name || "Business User"}! Manage purchases and funds.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardActionCard
          title="Make Purchase"
          description="Process payments using card details or unique barcodes."
          href="/business/make-purchase"
          icon={<ShoppingCart className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
        <DashboardActionCard
          title="Manage Funds"
          description="Deposit or withdraw money from user accounts."
          href="/business/manage-funds"
          icon={<Landmark className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
        />
         <DashboardActionCard
          title="View User Accounts"
          description="Browse user accounts for managing funds (view limited info)."
          href="/business/view-accounts"
          icon={<Users className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />}
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
