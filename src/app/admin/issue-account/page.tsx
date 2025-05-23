
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
import { issueNewAccountAction } from "@/actions/adminActions";
import { useState } from "react";
import type { Account } from "@/lib/types";
import { ArrowLeft, CheckCircle, CreditCard, Loader2, XCircle, User, KeyRound, Info } from "lucide-react"; // Changed AlertCircle to Info
import { LoadingLink } from "@/components/shared/LoadingLink";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const issueAccountSchema = z.object({
  accountHolderName: z.string().min(2, "Account holder name is required (min 2 chars)."),
  email: z.string().email("Invalid email address."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
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

export type IssueAccountFormValues = z.infer<typeof issueAccountSchema>;

interface IssuedDetails {
  account: Account;
  username: string;
  passwordForDisplay: string;
}

export default function IssueAccountPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [issuedDetails, setIssuedDetails] = useState<IssuedDetails | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<IssueAccountFormValues>({
    resolver: zodResolver(issueAccountSchema),
    defaultValues: {
      accountHolderName: "",
      email: "",
      username: "",
      password: "",
      phoneNumber: "",
      initialDeposit: 0,
    },
  });

  const onSubmit: SubmitHandler<IssueAccountFormValues> = async (data) => {
    setIsLoading(true);
    setFormError(null);
    setIssuedDetails(null);
    const payload = { ...data, initialDeposit: data.initialDeposit || 0 };
    const result = await issueNewAccountAction(payload);
    setIsLoading(false);

    if (result.success && result.details) {
      setIssuedDetails(result.details);
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
      <LoadingLink href="/admin/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Admin Dashboard
      </LoadingLink>
      <Card className="max-w-2xl mx-auto shadow-lg relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Processing, please wait...</p>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><CreditCard className="text-primary"/> Issue New Account</CardTitle>
          <CardDescription>
            Enter the new account holder's information, including their desired username and password. A unique digital card will be generated for them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <fieldset disabled={isLoading} className="space-y-6"> 
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
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><User className="h-4 w-4 text-muted-foreground"/> Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter desired username" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">The user will use this to log in.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><KeyRound className="h-4 w-4 text-muted-foreground"/> Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter a secure password" {...field} />
                      </FormControl>
                       <FormDescription className="text-xs">The user will use this to log in. They can change it later.</FormDescription>
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
                      <FormDescription>Enter an amount if you want to add starting funds to the account.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating & Issuing...</> : "Issue Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {issuedDetails && !isLoading && ( 
        <Card className="max-w-2xl mx-auto mt-8 shadow-lg bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700/50">
          <CardHeader>
            <CardTitle className="text-xl text-green-700 dark:text-green-300 flex items-center gap-2"><CheckCircle /> Account Issued Successfully!</CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              The following account details have been generated for {issuedDetails.account.accountHolderName}:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><strong>Account Holder:</strong> {issuedDetails.account.accountHolderName}</p>
            <p><strong>Email:</strong> {issuedDetails.account.email}</p>
            {issuedDetails.account.phoneNumber && <p><strong>Phone:</strong> {issuedDetails.account.phoneNumber}</p>}
            <p><strong>Card Number:</strong> <span className="font-mono">{issuedDetails.account.cardNumber}</span></p>
            <p><strong>CVV:</strong> <span className="font-mono">{issuedDetails.account.cvv}</span></p>
            <p><strong>Expiry Date:</strong> <span className="font-mono">{issuedDetails.account.expiryDate}</span></p>
            <p><strong>Barcode:</strong> <span className="font-mono">{issuedDetails.account.barcode}</span></p>
            <p><strong>Initial Balance:</strong> ${issuedDetails.account.balance.toFixed(2)}</p>
            <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary dark:bg-primary/20 dark:text-primary-foreground/90">
                <Info className="h-4 w-4" /> {/* Changed from AlertCircle for stylistic consistency */}
                <AlertTitle>User Credentials</AlertTitle>
                <AlertDescription>
                    Please provide the following login details to the user:
                    <br /><strong>Username:</strong> <span className="font-mono">{issuedDetails.username}</span>
                    <br /><strong>Password:</strong> <span className="font-mono">{issuedDetails.passwordForDisplay}</span> (Instruct user to change it later if they wish)
                </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
