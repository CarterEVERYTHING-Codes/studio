
"use client"; // This page is moved from business to admin

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { manageFundsAction } from "@/actions/businessActions"; // Action remains in businessActions, but is now admin-scoped by usage
import { useAuth } from "@/hooks/useAuth";
import { mockAccounts, mockUsers } from "@/lib/mock-data";
import { ArrowLeft, Landmark, Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { LoadingLink } from "@/components/shared/LoadingLink"; // Changed import
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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

export default function AdminManageFundsPage() {
  const { toast } = useToast();
  const { user } = useAuth(); // This will be an admin user
  const [isLoading, setIsLoading] = useState(false);
  const [operationResult, setOperationResult] = useState<{success: boolean, message: string} | null>(null);

  // Admins can manage any account type (user, business, or even other admin accounts if needed)
  const allManageableAccounts = mockAccounts.map(acc => {
    const linkedUser = mockUsers.find(u => u.id === acc.userId);
    const roleDisplay = linkedUser ? `(${linkedUser.role})` : '(No User Link)';
    return {
        ...acc,
        displayName: `${acc.accountHolderName} - ${acc.email} ${roleDisplay} - Bal: $${acc.balance.toFixed(2)}`
    }
  });

  const form = useForm<FundManagementFormValues>({
    resolver: zodResolver(fundManagementSchema),
    defaultValues: { targetAccountId: "", amount: undefined, operation: "deposit" },
  });

  const onSubmit: SubmitHandler<FundManagementFormValues> = async (data) => {
    if (!user) return; // Should be an admin
    setIsLoading(true);
    setOperationResult(null);
    const result = await manageFundsAction({ ...data, adminUserId: user.id }); // Pass adminUserId
    setIsLoading(false);
    setOperationResult(result);

    if (result.success) {
      toast({ title: "Success!", description: result.message });
      form.reset({ targetAccountId: "", amount: undefined, operation: data.operation }); 
    } else {
      toast({ title: "Operation Failed", description: result.message, variant: "destructive" });
    }
  };
  
  const selectedOperation = form.watch("operation");

  return (
    <div className="space-y-6">
      <LoadingLink href="/admin/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Admin Dashboard
      </LoadingLink>
      <Card className="max-w-lg mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><Landmark className="text-primary"/> Manage Account Funds (Admin)</CardTitle>
          <CardDescription>Deposit or withdraw funds from any account in the system. Use with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          {operationResult && (
             <Alert variant={operationResult.success ? "default" : "destructive"} className={`mb-4 ${operationResult.success ? 'bg-green-50 border-green-200 text-green-700' : ''}`}>
              {operationResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertTitle>{operationResult.success ? "Operation Successful" : "Operation Failed"}</AlertTitle>
              <AlertDescription>{operationResult.message}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="operation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operation Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select operation" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="deposit">Deposit to Account</SelectItem>
                        <SelectItem value="withdraw">Withdraw from Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select target account" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allManageableAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Enter amount" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : 
                `Confirm ${selectedOperation.charAt(0).toUpperCase() + selectedOperation.slice(1)}`}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
