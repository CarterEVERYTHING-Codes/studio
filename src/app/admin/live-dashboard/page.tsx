
"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import type { Account, Transaction, User } from "@/lib/types";
import { allTransactions, mockAccounts, mockUsers, MAIN_ADMIN_ACCOUNT_ID, MAIN_ADMIN_USER_ID } from "@/lib/mock-data";
import { issueNewAccountAction, type IssueAccountFormValues as AdminIssueAccountFormValues } from "@/actions/adminActions";
import { manageFundsAction } from "@/actions/businessActions"; // Action is admin-scoped by usage
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TransactionTable } from "@/components/shared/TransactionTable";

import { ArrowLeft, CheckCircle, CreditCard, Loader2, XCircle, AlertCircle as ImportedAlertCircleIcon, User as UserIconLucide, KeyRound, Landmark, Activity, Users, DollarSign } from "lucide-react";
import Link from "next/link";

// --- Schemas (copied from individual pages) ---
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
type IssueAccountFormValues = z.infer<typeof issueAccountSchema>;

const fundManagementSchema = z.object({
  targetAccountId: z.string().min(1, "Target account selection is required."),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Amount must be a number."})
      .positive("Amount must be a positive number.")
  ),
  operation: z.enum(["deposit", "withdraw"], { required_error: "Operation type is required." }),
});
type FundManagementFormValues = z.infer<typeof fundManagementSchema>;

interface IssuedDetails {
  account: Account;
  username: string;
  passwordForDisplay: string;
}

export default function AdminLiveDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // --- State for Live Transactions ---
  const [transactionsWithNames, setTransactionsWithNames] = useState<Transaction[]>([]);
  const [mainAdminAccountBalance, setMainAdminAccountBalance] = useState<number | null>(null);

  // --- State for Issue Account Form ---
  const [isIssuingAccount, setIsIssuingAccount] = useState(false);
  const [issuedAccountDetails, setIssuedAccountDetails] = useState<IssuedDetails | null>(null);
  const [issueAccountFormError, setIssueAccountFormError] = useState<string | null>(null);

  // --- State for Manage Funds Form ---
  const [isManagingFunds, setIsManagingFunds] = useState(false);
  const [manageFundsResult, setManageFundsResult] = useState<{success: boolean, message: string} | null>(null);
  
  const allManageableAccounts = mockAccounts.map(acc => {
    const linkedUser = mockUsers.find(u => u.id === acc.userId);
    const roleDisplay = linkedUser ? `(${linkedUser.role})` : '(No User Link)';
    return {
        ...acc,
        displayName: `${acc.accountHolderName} - ${acc.email} ${roleDisplay} - Bal: $${acc.balance.toFixed(2)}`
    }
  }).sort((a, b) => a.displayName.localeCompare(b.displayName));


  useEffect(() => {
    // Process transactions for display
    const processedTransactions = [...allTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
      const fromAccount = mockAccounts.find(acc => acc.id === tx.fromAccountId);
      const toAccount = mockAccounts.find(acc => acc.id === tx.toAccountId);
      return {
        ...tx,
        fromAccountId: fromAccount ? `${fromAccount.accountHolderName} (${tx.fromAccountId?.slice(0,5)}...)` : tx.fromAccountId || 'N/A',
        toAccountId: toAccount ? `${toAccount.accountHolderName} (${tx.toAccountId?.slice(0,5)}...)` : tx.toAccountId || 'N/A',
      };
    });
    setTransactionsWithNames(processedTransactions);

    // Get Main Admin balance
    if (user && user.id === MAIN_ADMIN_USER_ID) {
        const acc = mockAccounts.find(a => a.id === MAIN_ADMIN_ACCOUNT_ID);
        if (acc) {
            setMainAdminAccountBalance(acc.balance);
        }
    }
  }, [user, allTransactions, mockAccounts]); // Rerun if user, allTransactions or mockAccounts change

  const issueAccountForm = useForm<IssueAccountFormValues>({
    resolver: zodResolver(issueAccountSchema),
    defaultValues: {
      accountHolderName: "", email: "", username: "", password: "", phoneNumber: "", initialDeposit: 0,
    },
  });

  const manageFundsForm = useForm<FundManagementFormValues>({
    resolver: zodResolver(fundManagementSchema),
    defaultValues: { targetAccountId: "", amount: undefined, operation: "deposit" },
  });

  const handleIssueAccountSubmit: SubmitHandler<IssueAccountFormValues> = async (data) => {
    setIsIssuingAccount(true);
    setIssueAccountFormError(null);
    setIssuedAccountDetails(null);
    const payload = { ...data, initialDeposit: data.initialDeposit || 0 };
    const result = await issueNewAccountAction(payload);
    setIsIssuingAccount(false);

    if (result.success && result.details) {
      setIssuedAccountDetails(result.details);
      toast({ title: "Success!", description: result.message, variant: "default" });
      issueAccountForm.reset();
       // Manually trigger re-fetch/re-process of transactions and accounts
      const updatedAccounts = [...mockAccounts]; // Create a new reference
      const updatedTransactions = [...allTransactions];
      // This is a trick to force re-render if mock data is mutated directly.
      // In a real app, this would be handled by state management or query invalidation.
      setMainAdminAccountBalance(mockAccounts.find(a => a.id === MAIN_ADMIN_ACCOUNT_ID)?.balance ?? null);
      setTransactionsWithNames(updatedTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
         const fromAccount = updatedAccounts.find(acc => acc.id === tx.fromAccountId);
         const toAccount = updatedAccounts.find(acc => acc.id === tx.toAccountId);
        return {
            ...tx,
            fromAccountId: fromAccount ? `${fromAccount.accountHolderName} (${tx.fromAccountId?.slice(0,5)}...)` : tx.fromAccountId || 'N/A',
            toAccountId: toAccount ? `${toAccount.accountHolderName} (${tx.toAccountId?.slice(0,5)}...)` : tx.toAccountId || 'N/A',
        };
      }));
    } else {
      setIssueAccountFormError(result.message);
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleManageFundsSubmit: SubmitHandler<FundManagementFormValues> = async (data) => {
    if (!user) return;
    setIsManagingFunds(true);
    setManageFundsResult(null);
    const result = await manageFundsAction({ ...data, adminUserId: user.id });
    setIsManagingFunds(false);
    setManageFundsResult(result);

    if (result.success) {
      toast({ title: "Success!", description: result.message });
      manageFundsForm.reset({ targetAccountId: "", amount: undefined, operation: data.operation });
      // Manually trigger re-fetch/re-process
      const updatedAccounts = [...mockAccounts];
      const updatedTransactions = [...allTransactions];
      setMainAdminAccountBalance(mockAccounts.find(a => a.id === MAIN_ADMIN_ACCOUNT_ID)?.balance ?? null);
      setTransactionsWithNames(updatedTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
         const fromAccount = updatedAccounts.find(acc => acc.id === tx.fromAccountId);
         const toAccount = updatedAccounts.find(acc => acc.id === tx.toAccountId);
        return {
            ...tx,
            fromAccountId: fromAccount ? `${fromAccount.accountHolderName} (${tx.fromAccountId?.slice(0,5)}...)` : tx.fromAccountId || 'N/A',
            toAccountId: toAccount ? `${toAccount.accountHolderName} (${tx.toAccountId?.slice(0,5)}...)` : tx.toAccountId || 'N/A',
        };
      }));
    } else {
      toast({ title: "Operation Failed", description: result.message, variant: "destructive" });
    }
  };

  const selectedFundOperation = manageFundsForm.watch("operation");

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="text-primary h-8 w-8"/> Admin Live Dashboard</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main Dashboard
          </Link>
        </Button>
      </div>

      {user?.id === MAIN_ADMIN_USER_ID && mainAdminAccountBalance !== null && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-green-700 dark:text-green-300 flex items-center gap-2">
                <DollarSign /> Main Admin Fee Collection Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-800 dark:text-green-200">Balance: ${mainAdminAccountBalance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">This account receives all service fees. Balance updates with new transactions.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Account Section */}
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><CreditCard className="text-primary"/> Issue New Account</CardTitle>
            <CardDescription>Create a new user account with credentials and optional deposit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...issueAccountForm}>
              <form onSubmit={issueAccountForm.handleSubmit(handleIssueAccountSubmit)} className="space-y-4">
                {issueAccountFormError && (
                  <Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertTitle>Creation Failed</AlertTitle><AlertDescription>{issueAccountFormError}</AlertDescription></Alert>
                )}
                <FormField control={issueAccountForm.control} name="accountHolderName" render={({ field }) => (
                  <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={issueAccountForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={issueAccountForm.control} name="username" render={({ field }) => (
                  <FormItem><FormLabel className="flex items-center gap-1"><UserIconLucide className="h-4 w-4"/>Username</FormLabel><FormControl><Input placeholder="johndoe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={issueAccountForm.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel className="flex items-center gap-1"><KeyRound className="h-4 w-4"/>Password</FormLabel><FormControl><Input type="password" placeholder="min. 6 characters" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={issueAccountForm.control} name="phoneNumber" render={({ field }) => (
                  <FormItem><FormLabel>Phone (Optional)</FormLabel><FormControl><Input type="tel" placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={issueAccountForm.control} name="initialDeposit" render={({ field }) => (
                  <FormItem><FormLabel>Initial Deposit (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isIssuingAccount}>
                  {isIssuingAccount ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Issuing...</> : "Issue Account"}
                </Button>
              </form>
            </Form>
            {issuedAccountDetails && (
              <Alert variant="default" className="mt-4 bg-green-50 border-green-200 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Account Issued Successfully!</AlertTitle>
                <AlertDescription className="space-y-1 text-xs">
                  <p><strong>Holder:</strong> {issuedAccountDetails.account.accountHolderName}</p>
                  <p><strong>Email:</strong> {issuedAccountDetails.account.email}</p>
                  <p><strong>Card:</strong> {issuedAccountDetails.account.cardNumber} | <strong>CVV:</strong> {issuedAccountDetails.account.cvv} | <strong>Expiry:</strong> {issuedAccountDetails.account.expiryDate}</p>
                  <p><strong>Barcode:</strong> {issuedAccountDetails.account.barcode}</p>
                  <p><strong>Balance:</strong> ${issuedAccountDetails.account.balance.toFixed(2)}</p>
                  <div className="font-semibold mt-2">Login: <span className="font-mono">{issuedAccountDetails.username}</span> / <span className="font-mono">{issuedAccountDetails.passwordForDisplay}</span></div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Manage Funds Section */}
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Landmark className="text-primary"/> Manage Account Funds</CardTitle>
            <CardDescription>Deposit or withdraw funds from any account.</CardDescription>
          </CardHeader>
          <CardContent>
            {manageFundsResult && (
              <Alert variant={manageFundsResult.success ? "default" : "destructive"} className={`mb-4 ${manageFundsResult.success ? 'bg-green-50 border-green-200 text-green-700' : ''}`}>
                {manageFundsResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{manageFundsResult.success ? "Success" : "Failed"}</AlertTitle><AlertDescription>{manageFundsResult.message}</AlertDescription>
              </Alert>
            )}
            <Form {...manageFundsForm}>
              <form onSubmit={manageFundsForm.handleSubmit(handleManageFundsSubmit)} className="space-y-4">
                <FormField control={manageFundsForm.control} name="operation" render={({ field }) => (
                  <FormItem><FormLabel>Operation</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select operation" /></SelectTrigger></FormControl><SelectContent><SelectItem value="deposit">Deposit</SelectItem><SelectItem value="withdraw">Withdraw</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={manageFundsForm.control} name="targetAccountId" render={({ field }) => (
                  <FormItem><FormLabel>Target Account</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select target account" /></SelectTrigger></FormControl><SelectContent>{allManageableAccounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.displayName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={manageFundsForm.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isManagingFunds}>
                  {isManagingFunds ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : `Confirm ${selectedFundOperation}`}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Placeholder for future components if needed, or just to balance the grid */}
         <div className="lg:col-span-1 hidden lg:block"> 
            {/* This div can be used for spacing or additional small info cards later */}
        </div>

      </div>


      {/* Live Transactions Section */}
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><Users className="text-primary"/> Recent System Transactions</CardTitle>
          <CardDescription>A log of all financial activities across the platform. Updates when new actions are performed on this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionTable transactions={transactionsWithNames} caption="All system transactions" maxHeight="60vh" />
        </CardContent>
      </Card>
    </div>
  );
}

