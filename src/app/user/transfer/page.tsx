
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { initiateTransferAction, type InitiateTransferFormValues } from "@/actions/userActions";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect }_ // Removed unused React import
import { ArrowLeft, Loader2, Send, User, DollarSign, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { mockAccounts } from "@/lib/mock-data";

const transferSchema = z.object({
  recipientUsername: z.string().min(3, "Recipient username must be at least 3 characters."),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Amount must be a number."})
      .positive("Amount must be a positive number.")
  ),
});

export default function TransferMoneyPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  const form = useForm<InitiateTransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientUsername: "",
      amount: undefined,
    },
  });

  useEffect(() => {
    if (user) {
      const userAccount = mockAccounts.find(acc => acc.userId === user.id);
      if (userAccount) {
        setCurrentBalance(userAccount.balance);
      }
    }
  }, [user]);

  const onSubmit: SubmitHandler<InitiateTransferFormValues> = async (data) => {
    if (!user) {
      setFormError("You must be logged in to initiate a transfer.");
      return;
    }
    setIsLoading(true);
    setFormError(null);
    setFormSuccess(null);

    const result = await initiateTransferAction({ ...data, senderUserId: user.id });
    setIsLoading(false);

    if (result.success) {
      setFormSuccess(result.message);
      toast({
        title: "Transfer Initiated!",
        description: result.message,
      });
      // Refresh balance display
      const userAccount = mockAccounts.find(acc => acc.userId === user.id);
      if (userAccount) setCurrentBalance(userAccount.balance);
      form.reset();
    } else {
      setFormError(result.message);
      toast({
        title: "Transfer Failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/user/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </Link>
      <Card className="max-w-lg mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><Send className="text-primary"/> Transfer Money</CardTitle>
          <CardDescription>Send funds to another user. The recipient will need to approve the transfer.</CardDescription>
        </CardHeader>
        <CardContent>
          {currentBalance !== null && (
            <Alert variant="default" className="mb-4 bg-primary/10 border-primary/20">
              <DollarSign className="h-4 w-4 text-primary" />
              <AlertTitle>Your Current Balance</AlertTitle>
              <AlertDescription>
                You have <strong>${currentBalance.toFixed(2)}</strong> available to transfer.
              </AlertDescription>
            </Alert>
          )}
           {formError && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Transfer Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {formSuccess && (
            <Alert variant="default" className="mb-4 bg-green-50 border-green-200 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{formSuccess}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="recipientUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><User className="h-4 w-4 text-muted-foreground"/> Recipient's Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter recipient's username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><DollarSign className="h-4 w-4 text-muted-foreground"/> Amount to Transfer</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="e.g., 25.50" 
                        {...field} 
                        onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initiating...</> : "Initiate Transfer"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
