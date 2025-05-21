
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { issueNewAccountAction, type IssueAccountFormValues } from "@/actions/adminActions";
import { useState } from "react";
import type { Account } from "@/lib/types";
import { ArrowLeft, CheckCircle, CreditCard, Loader2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const issueAccountSchema = z.object({
  accountHolderName: z.string().min(2, "Account holder name is required (min 2 chars)."),
  email: z.string().email("Invalid email address."),
  phoneNumber: z.string().optional().refine(val => !val || /^\d{10,15}$/.test(val), {
    message: "Phone number must be 10-15 digits, or leave empty.",
  }),
  initialDeposit: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Initial deposit must be a number."})
      .min(0, "Initial deposit cannot be negative.")
      .optional()
  ),
});


export default function IssueAccountPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [issuedAccount, setIssuedAccount] = useState<Account | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<IssueAccountFormValues>({
    resolver: zodResolver(issueAccountSchema),
    defaultValues: {
      accountHolderName: "",
      email: "",
      phoneNumber: "",
      initialDeposit: 0,
    },
  });

  const onSubmit: SubmitHandler<IssueAccountFormValues> = async (data) => {
    setIsLoading(true);
    setFormError(null);
    setIssuedAccount(null);
    const result = await issueNewAccountAction({ ...data, initialDeposit: data.initialDeposit || 0 });
    setIsLoading(false);

    if (result.success && result.account) {
      setIssuedAccount(result.account);
      toast({
        title: "Success!",
        description: result.message,
        variant: "default",
      });
      form.reset();
    } else {
      setFormError(result.message);
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Admin Dashboard
      </Link>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><CreditCard className="text-primary"/> Issue New Account</CardTitle>
          <CardDescription>
            Enter the new account holder's details. Card number, CVV, expiry, and barcode will be generated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {formError && (
                 <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Account Creation Failed</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
              )}
              <FormField
                control={form.control}
                name="accountHolderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Holder Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g., john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g., 1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialDeposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Deposit (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 50.00" {...field} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>Enter the initial amount to deposit into the account.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating & Issuing...</> : "Issue Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {issuedAccount && (
        <Card className="max-w-2xl mx-auto mt-8 shadow-lg bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-xl text-green-700 flex items-center gap-2"><CheckCircle /> Account Issued Successfully!</CardTitle>
            <CardDescription className="text-green-600">
              The following account details have been generated for {issuedAccount.accountHolderName}:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><strong>Account Holder:</strong> {issuedAccount.accountHolderName}</p>
            <p><strong>Email:</strong> {issuedAccount.email}</p>
            {issuedAccount.phoneNumber && <p><strong>Phone:</strong> {issuedAccount.phoneNumber}</p>}
            <p><strong>Card Number:</strong> <span className="font-mono">{issuedAccount.cardNumber}</span></p>
            <p><strong>CVV:</strong> <span className="font-mono">{issuedAccount.cvv}</span></p>
            <p><strong>Expiry Date:</strong> <span className="font-mono">{issuedAccount.expiryDate}</span></p>
            <p><strong>Barcode:</strong> <span className="font-mono">{issuedAccount.barcode}</span></p>
            <p><strong>Initial Balance:</strong> ${issuedAccount.balance.toFixed(2)}</p>
            <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>Please ensure the new user is informed of their login credentials (default password: 'password123', username is based on email).</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

