
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { mockAccounts, getAccountByUserId } from "@/lib/mock-data"; // Ensure getAccountByUserId is exported
import type { Account } from "@/lib/types";
import { 
  updateUsernameAction, updatePasswordAction, regenerateCardDetailsAction, 
  toggleFreezeCardAction, setPurchaseLimitAction, toggleBarcodeDisabledAction,
  type UpdateUsernameFormValues, type UpdatePasswordFormValues
} from "@/actions/userActions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LoadingLink } from "@/components/shared/LoadingLink";
import { ArrowLeft, Loader2, User, KeyRound, RefreshCw, Lock, CreditCard, Ban, BarChartBig, ShieldAlert, CheckCircle, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription} from "@/components/ui/alert";


const updateUsernameSchema = z.object({
  newUsername: z.string().min(3, "Username must be at least 3 characters."),
});

const updatePasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match.",
  path: ["confirmNewPassword"],
});

const purchaseLimitSchema = z.object({
    limit: z.preprocess(
    (val) => (val === "" || val === undefined || val === null || Number.isNaN(Number(val)) ? undefined : Number(val)),
    z.number({ invalid_type_error: "Limit must be a number or empty for no limit."})
      .min(0, "Limit must be zero or positive.")
      .optional()
  ),
});

export default function CardSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({}); // For multiple forms/actions
  const [formResults, setFormResults] = useState<Record<string, {success: boolean, message: string} | null>>({});

  const fetchAccountDetails = useCallback(() => {
    if (user) {
      const userAccount = getAccountByUserId(user.id);
      setAccount(userAccount || null);
    }
  }, [user]);

  useEffect(() => {
    fetchAccountDetails();
  }, [fetchAccountDetails]);
  
  const usernameForm = useForm<z.infer<typeof updateUsernameSchema>>({
    resolver: zodResolver(updateUsernameSchema),
    defaultValues: { newUsername: user?.username || "" },
  });

  const passwordForm = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });
  
  const purchaseLimitForm = useForm<z.infer<typeof purchaseLimitSchema>>({
    resolver: zodResolver(purchaseLimitSchema),
  });

  useEffect(() => {
      if (account) {
          usernameForm.setValue("newUsername", user?.username || "");
          purchaseLimitForm.setValue("limit", account.purchaseLimitPerTransaction === null ? undefined : account.purchaseLimitPerTransaction);
      }
  }, [account, user, usernameForm, purchaseLimitForm]);


  const handleAction = async (actionName: string, actionFn: () => Promise<{success: boolean, message: string}>, formToReset?: any) => {
    setIsLoading(prev => ({ ...prev, [actionName]: true }));
    setFormResults(prev => ({...prev, [actionName]: null}));
    const result = await actionFn();
    setIsLoading(prev => ({ ...prev, [actionName]: false }));
    setFormResults(prev => ({...prev, [actionName]: result}));

    if (result.success) {
      toast({ title: "Success!", description: result.message });
      fetchAccountDetails(); // Refresh account details
      if (formToReset && typeof formToReset.reset === 'function') formToReset.reset();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const onUsernameSubmit: SubmitHandler<z.infer<typeof updateUsernameSchema>> = async (data) => {
    if (!user) return;
    await handleAction("username", () => updateUsernameAction({ userId: user.id, newUsername: data.newUsername }), usernameForm);
  };

  const onPasswordSubmit: SubmitHandler<z.infer<typeof updatePasswordSchema>> = async (data) => {
    if (!user) return;
    await handleAction("password", () => updatePasswordAction({ userId: user.id, newPassword: data.newPassword }), passwordForm);
  };

  const onRegenerateCard = async () => {
    if (!user) return;
    await handleAction("regenerateCard", () => regenerateCardDetailsAction({ userId: user.id }));
  };

  const onToggleFreeze = async (freeze: boolean) => {
    if (!user) return;
    await handleAction(`freeze-${freeze}`, () => toggleFreezeCardAction({ userId: user.id, freeze }));
  };
  
  const onPurchaseLimitSubmit: SubmitHandler<z.infer<typeof purchaseLimitSchema>> = async (data) => {
    if (!user) return;
    await handleAction("purchaseLimit", () => setPurchaseLimitAction({ userId: user.id, limit: data.limit }), purchaseLimitForm);
  };

  const onToggleBarcodeDisabled = async (disable: boolean) => {
    if (!user) return;
    await handleAction(`barcode-${disable}`, () => toggleBarcodeDisabledAction({ userId: user.id, disable }));
  };

  if (!user || !account) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading account settings...</p>
      </div>
    );
  }
  
  const renderFormResult = (actionName: string) => {
    const result = formResults[actionName];
    if (!result) return null;
    return (
        <Alert variant={result.success ? "default" : "destructive"} className={`mt-2 mb-4 text-xs ${result.success ? 'bg-green-50 border-green-200 text-green-700' : ''}`}>
            {result.success ? <CheckCircle className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>}
            <AlertDescription>{result.message}</AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <LoadingLink href="/user/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </LoadingLink>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Card & Account Settings</CardTitle>
          <CardDescription>Manage your account credentials, card security, and payment preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* Account Credentials Section */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><User className="text-primary"/> Account Credentials</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Form {...usernameForm}>
                <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-3 p-4 border rounded-md">
                  <FormLabel className="text-md font-medium">Change Username</FormLabel>
                  {renderFormResult("username")}
                  <FormField control={usernameForm.control} name="newUsername" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">New Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" size="sm" disabled={isLoading["username"]}>
                    {isLoading["username"] ? <Loader2 className="animate-spin" /> : "Update Username"}
                  </Button>
                </form>
              </Form>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-3 p-4 border rounded-md">
                  <FormLabel className="text-md font-medium">Change Password</FormLabel>
                  {renderFormResult("password")}
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Confirm New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" size="sm" disabled={isLoading["password"]}>
                    {isLoading["password"] ? <Loader2 className="animate-spin" /> : "Update Password"}
                  </Button>
                </form>
              </Form>
            </div>
          </section>

          <Separator />

          {/* Card Management Section */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><CreditCard className="text-primary"/> Card Management</h3>
             {renderFormResult("regenerateCard")}
             {renderFormResult(`freeze-${!account.isFrozen}`)}
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                        <FormLabel className="font-medium">Issue New Card</FormLabel>
                        <FormDescription className="text-xs">
                            This will generate a new card number, CVV, expiry, and barcode. Your old card will be deactivated.
                        </FormDescription>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isLoading["regenerateCard"]}>
                            {isLoading["regenerateCard"] ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                            Re-Issue Card
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Confirm Re-Issue Card?</AlertDialogTitle>
                            <AlertDialogDescription>
                            Are you sure you want to issue a new card? Your current card details will be permanently replaced and will no longer work.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={onRegenerateCard} className="bg-destructive hover:bg-destructive/90">Confirm Re-Issue</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                        <FormLabel className="font-medium">Freeze Card Purchases</FormLabel>
                        <FormDescription className="text-xs">
                            Temporarily disable all purchases made with your card.
                        </FormDescription>
                    </div>
                    <Switch 
                        checked={account.isFrozen} 
                        onCheckedChange={(checked) => onToggleFreeze(checked)}
                        disabled={isLoading[`freeze-${!account.isFrozen}`]}
                        aria-label="Freeze card purchases"
                    />
                </div>
            </div>
          </section>

          <Separator />

          {/* Security & Limits Section */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><ShieldAlert className="text-primary"/> Security & Limits</h3>
            <div className="space-y-4">
                <Form {...purchaseLimitForm}>
                    <form onSubmit={purchaseLimitForm.handleSubmit(onPurchaseLimitSubmit)} className="p-4 border rounded-md space-y-3">
                        <FormLabel className="text-md font-medium flex items-center gap-2"><BarChartBig /> Per Transaction Purchase Limit</FormLabel>
                        {renderFormResult("purchaseLimit")}
                        <FormField control={purchaseLimitForm.control} name="limit" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Limit Amount ($)</FormLabel>
                                <FormControl>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="Enter limit or leave empty for no limit" 
                                    {...field} 
                                    value={field.value === undefined ? '' : field.value}
                                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                />
                                </FormControl>
                                <FormDescription className="text-xs">Set to 0 or leave empty to remove the limit.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" size="sm" disabled={isLoading["purchaseLimit"]}>
                            {isLoading["purchaseLimit"] ? <Loader2 className="animate-spin" /> : "Set Limit"}
                        </Button>
                    </form>
                </Form>
                 {renderFormResult(`barcode-${!account.isBarcodeDisabled}`)}
                <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                        <FormLabel className="font-medium">Barcode Payments</FormLabel>
                        <FormDescription className="text-xs">
                            Enable or disable the ability to make payments using your 8-digit barcode.
                        </FormDescription>
                    </div>
                    <Switch 
                        checked={!account.isBarcodeDisabled} 
                        onCheckedChange={(checked) => onToggleBarcodeDisabled(!checked)}
                        disabled={isLoading[`barcode-${!account.isBarcodeDisabled}`]}
                        aria-label="Enable/Disable barcode payments"
                    />
                </div>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
