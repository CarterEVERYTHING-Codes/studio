
"use client";

import { useAuth } from "@/hooks/useAuth";
import { mockAccounts } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import type { Account } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, ShieldCheck, QrCode, CalendarDays, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingLink } from "@/components/shared/LoadingLink"; // Changed import

export default function UserCardInfoPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

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
    return <div className="text-center py-10">Loading card details...</div>;
  }

  if (!account) {
    return (
      <div className="text-center py-10 text-destructive">
        Account information not found. Please contact support.
      </div>
    );
  }

  const toggleDetails = () => setShowDetails(!showDetails);

  return (
    <div className="space-y-6">
       <LoadingLink href="/user/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </LoadingLink>
      <Card className="max-w-lg mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><CreditCard className="text-primary"/> Your Card Information</CardTitle>
          <CardDescription>
            View your digital card details. Keep this information secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">{account.accountHolderName}</h3>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 opacity-80">
                <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Z" />
              </svg>
            </div>
            <p className="font-mono text-2xl tracking-wider mb-4">
              {showDetails ? account.cardNumber : account.cardNumber.replace(/\d(?=\d{4})/g, "*")}
            </p>
            <div className="flex justify-between text-sm">
              <div>
                <p className="opacity-70 text-xs">Expires End</p>
                <p className="font-medium">{showDetails ? account.expiryDate : "**/**"}</p>
              </div>
              <div>
                <p className="opacity-70 text-xs">CVV</p>
                <p className="font-medium">{showDetails ? account.cvv : "***"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <InfoItem icon={<QrCode className="text-primary" />} label="Barcode" value={showDetails ? account.barcode : "********"} mono />
            <InfoItem icon={<CalendarDays className="text-primary" />} label="Expiry Date" value={showDetails ? account.expiryDate : "**/**"} mono />
            <InfoItem icon={<Lock className="text-primary" />} label="CVV" value={showDetails ? account.cvv : "***"} mono />
            <InfoItem icon={<ShieldCheck className="text-primary" />} label="Account ID" value={account.id.substring(0,10)+"..."} mono />
          </div>

          <Button onClick={toggleDetails} variant="outline" className="w-full mt-4">
            {showDetails ? "Hide Full Details" : "Show Full Details"}
          </Button>

          {!showDetails && (
             <Alert variant="default" className="mt-4 bg-secondary/50">
                <ShieldCheck className="h-4 w-4"/>
                <AlertTitle>Security Notice</AlertTitle>
                <AlertDescription>
                    Card details are partially hidden for your security. Click "Show Full Details" to reveal them.
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    mono?: boolean;
}

function InfoItem({ icon, label, value, mono }: InfoItemProps) {
    return (
        <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
            <div className="text-muted-foreground">{icon}</div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
            </div>
        </div>
    );
}
