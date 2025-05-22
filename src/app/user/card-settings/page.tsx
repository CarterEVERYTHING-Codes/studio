
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getAccountByUserId, mockUsers } from "@/lib/mock-data"; 
import type { Account } from "@/lib/types";
import { 
  updateUsernameAction, updatePasswordAction, regenerateCardDetailsAction, 
  toggleFreezeCardAction, setPurchaseLimitAction, toggleBarcodeDisabledAction,
  type UpdateUsernameFormValues, type UpdatePasswordFormValues
} from "@/actions/userActions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel as RHFFormLabel, FormMessage, FormDescription as RHFFormDescription } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
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

  // State for forms
  const [formLoading, setFormLoading] = useState<Record<string, boolean>>({});
  const [formResults, setFormResults] = useState<Record<string, {success: boolean, message: string} | null>>({});

  // Dedicated state for non-form actions
  const [isLoadingRegenerate, setIsLoadingRegenerate] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState<{success: boolean, message: string} | null>(null);
  
  const [isLoadingFreeze, setIsLoadingFreeze] = useState(false);
  const [freezeResult, setFreezeResult] = useState<{success: boolean, message: string} | null>(null);

  const [isLoadingBarcode, setIsLoadingBarcode] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<{success: boolean, message: string} | null>(null);


  useEffect(() => {
    if (user) {
      const userAccountData = getAccountByUserId(user.id);
      setAccount(userAccountData ? { ...userAccountData } : null);
    }
  }, [user]);
  
  const usernameForm = useForm<z.infer<typeof updateUsernameSchema>>({
    resolver: zodResolver(updateUsernameSchema),
  });

  const passwordForm = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });
  
  const purchaseLimitForm = useForm<z.infer<typeof purchaseLimitSchema>>({
    resolver: zodResolver(purchaseLimitSchema),
  });

  useEffect(() => {
      if (user && account) {
          const currentUserDetails = mockUsers.find(u => u.id === user.id);
          usernameForm.reset({ newUsername: currentUserDetails?.username || "" });
          purchaseLimitForm.reset({ limit: account.purchaseLimitPerTransaction === null || account.purchaseLimitPerTransaction === undefined ? undefined : account.purchaseLimitPerTransaction });
      } else if (user) { 
          const currentUserDetails = mockUsers.find(u => u.id === user.id);
          usernameForm.reset({ newUsername: currentUserDetails?.username || "" });
          purchaseLimitForm.reset({ limit: undefined });
      }
  }, [account, user, usernameForm, purchaseLimitForm]);


  const handleFormAction = useCallback(async (
    actionName: string, 
    actionFn: () => Promise<{success: boolean, message: string}>, 
    formToReset?: 'password' 
  ) => {
    setFormLoading(prev => ({ ...prev, [actionName]: true }));
    setFormResults(prev => ({...prev, [actionName]: null}));
    
    const result = await actionFn(); 

    if (user) {
        const updatedAccount = getAccountByUserId(user.id);
        setAccount(updatedAccount ? { ...updatedAccount } : null); 
    }
    
    setFormResults(prev => ({...prev, [actionName]: result}));
    setFormLoading(prev => ({ ...prev, [actionName]: false }));

    if (result.success) {
      toast({ title: "Success!", description: result.message });
      if (formToReset === 'password') {
        passwordForm.reset({ newPassword: "", confirmNewPassword: "" });
      }
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  }, [user, toast, passwordForm]);


  const onUsernameSubmit: SubmitHandler<z.infer<typeof updateUsernameSchema>> = async (data) => {
    if (!user) return;
    await handleFormAction("username", () => updateUsernameAction({ userId: user.id, newUsername: data.newUsername }));
  };

  const onPasswordSubmit: SubmitHandler<z.infer<typeof updatePasswordSchema>> = async (data) => {
    if (!user) return;
    await handleFormAction("password", () => updatePasswordAction({ userId: user.id, newPassword: data.newPassword }), 'password');
  };
  
  const onPurchaseLimitSubmit: SubmitHandler<z.infer<typeof purchaseLimitSchema>> = async (data) => {
    if (!user) return;
    await handleFormAction("purchaseLimit", () => setPurchaseLimitAction({ userId: user.id, limit: data.limit }));
  };


  const onRegenerateCard = async () => {
    if (!user) return;
    setIsLoadingRegenerate(true);
    setRegenerateResult(null);
    const result = await regenerateCardDetailsAction({ userId: user.id });
    const updatedAccount = getAccountByUserId(user.id);
    setAccount(updatedAccount ? { ...updatedAccount } : null);
    setRegenerateResult(result);
    setIsLoadingRegenerate(false);
    if (result.success) toast({ title: "Success!", description: result.message });
    else toast({ title: "Error", description: result.message, variant: "destructive" });
  };

  const onToggleFreeze = async (freeze: boolean) => {
    if (!user) return;
    setIsLoadingFreeze(true);
    setFreezeResult(null);
    const result = await toggleFreezeCardAction({ userId: user.id, freeze });
    const updatedAccount = getAccountByUserId(user.id);
    setAccount(updatedAccount ? { ...updatedAccount } : null);
    setFreezeResult(result);
    setIsLoadingFreeze(false);
    if (result.success) toast({ title: "Success!", description: result.message });
    else toast({ title: "Error", description: result.message, variant: "destructive" });
  };

  const onToggleBarcodeDisabled = async (disable: boolean) => {
    if (!user) return;
    setIsLoadingBarcode(true);
    setBarcodeResult(null);
    const result = await toggleBarcodeDisabledAction({ userId: user.id, disable });
    const updatedAccount = getAccountByUserId(user.id);
    setAccount(updatedAccount ? { ...updatedAccount } : null);
    setBarcodeResult(result);
    setIsLoadingBarcode(false);
    if (result.success) toast({ title: "Success!", description: result.message });
    else toast({ title: "Error", description: result.message, variant: "destructive" });
  };


  if (!user || !account) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading account settings...</p>
      </div>
    );
  }
  
  const renderActionResult = (result: {success: boolean, message: string} | null) => {
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
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><User className="text-primary h-5 w-5"/> Account Credentials</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Form {...usernameForm}>
                <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-3 p-4 border rounded-md">
                  <RHFFormLabel className="text-md font-medium">Change Username</RHFFormLabel>
                  {renderActionResult(formResults["username"])}
                  <FormField control={usernameForm.control} name="newUsername" render={({ field }) => (
                    <FormItem><RHFFormLabel className="text-xs">New Username</RHFFormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" size="sm" disabled={formLoading["username"]}>
                    {formLoading["username"] ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    Update Username
                  </Button>
                </form>
              </Form>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-3 p-4 border rounded-md">
                  <RHFFormLabel className="text-md font-medium">Change Password</RHFFormLabel>
                  {renderActionResult(formResults["password"])}
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem><RHFFormLabel className="text-xs">New Password</RHFFormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                    <FormItem><RHFFormLabel className="text-xs">Confirm New Password</RHFFormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" size="sm" disabled={formLoading["password"]}>
                    {formLoading["password"] ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    Update Password
                  </Button>
                </form>
              </Form>
            </div>
          </section>

          <Separator />

          {/* Card Management Section */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><CreditCard className="text-primary h-5 w-5"/> Card Management</h3>
             {renderActionResult(regenerateResult)}
             {renderActionResult(freezeResult)}
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                        <Label className="font-medium">Issue New Card</Label>
                        <p className="text-xs text-muted-foreground">
                            This will generate a new card number, CVV, expiry, and barcode. Your old card will be deactivated.
                        </p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isLoadingRegenerate}>
                            {isLoadingRegenerate ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-1" />} 
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
                        <Label className="font-medium">Freeze Card Purchases</Label>
                        <p className="text-xs text-muted-foreground">
                            Temporarily disable all purchases made with your card.
                        </p>
                    </div>
                    <Switch 
                        checked={account.isFrozen} 
                        onCheckedChange={(checked) => onToggleFreeze(checked)}
                        disabled={isLoadingFreeze}
                        aria-label="Freeze card purchases"
                    />
                </div>
            </div>
          </section>

          <Separator />

          {/* Security & Limits Section */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><ShieldAlert className="text-primary h-5 w-5"/> Security & Limits</h3>
            {renderActionResult(barcodeResult)}
            <div className="space-y-4">
                <Form {...purchaseLimitForm}>
                    <form onSubmit={purchaseLimitForm.handleSubmit(onPurchaseLimitSubmit)} className="p-4 border rounded-md space-y-3">
                        <RHFFormLabel className="text-md font-medium flex items-center gap-2"><BarChartBig className="h-4 w-4"/> Per Transaction Purchase Limit</RHFFormLabel> 
                        {renderActionResult(formResults["purchaseLimit"])}
                        <FormField control={purchaseLimitForm.control} name="limit" render={({ field }) => (
                            <FormItem>
                                <RHFFormLabel className="text-xs">Limit Amount ($)</RHFFormLabel>
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
                                <RHFFormDescription className="text-xs">Set to 0 or leave empty to remove the limit.</RHFFormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" size="sm" disabled={formLoading["purchaseLimit"]}>
                            {formLoading["purchaseLimit"] ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                             Set Limit
                        </Button>
                    </form>
                </Form>
                
                <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                        <Label className="font-medium">Barcode Payments</Label>
                        <p className="text-xs text-muted-foreground">
                            Enable or disable the ability to make payments using your 8-digit barcode.
                        </p>
                    </div>
                    <Switch 
                        checked={!account.isBarcodeDisabled} 
                        onCheckedChange={(checked) => onToggleBarcodeDisabled(!checked)}
                        disabled={isLoadingBarcode}
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
    
