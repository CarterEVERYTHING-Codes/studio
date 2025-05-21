
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { makeCardPaymentAction, makeBarcodePaymentAction } from "@/actions/businessActions";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, CreditCard, QrCode, ScanLine, Loader2, AlertCircle, XCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const cardPaymentSchema = z.object({
  cardNumber: z.string().min(12, "Card number min 12 chars").max(19, "Card number max 19 chars").regex(/^\d+$/, "Card number must be digits"),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry date must be MM/YY (e.g., 12/25)"),
  cvv: z.string().min(3, "CVV must be 3-4 digits").max(4, "CVV must be 3-4 digits").regex(/^\d+$/, "CVV must be digits"),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Amount must be a number."})
      .positive("Amount must be a positive number.")
  ),
});
type CardPaymentFormValues = z.infer<typeof cardPaymentSchema>;

const barcodePaymentSchema = z.object({
  barcode: z.string().length(8, "Barcode must be 8 digits.").regex(/^\d+$/, "Barcode must be digits"),
  cvv: z.string().min(3, "CVV must be 3-4 digits").max(4, "CVV must be 3-4 digits").regex(/^\d+$/, "CVV must be digits"),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Amount must be a number."})
      .positive("Amount must be a positive number.")
  ),
});
type BarcodePaymentFormValues = z.infer<typeof barcodePaymentSchema>;

export default function MakePurchasePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{success: boolean, message: string} | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);


  const cardForm = useForm<CardPaymentFormValues>({
    resolver: zodResolver(cardPaymentSchema),
    defaultValues: { cardNumber: "", expiryDate: "", cvv: "", amount: undefined },
  });

  const barcodeForm = useForm<BarcodePaymentFormValues>({
    resolver: zodResolver(barcodePaymentSchema),
    defaultValues: { barcode: "", cvv: "", amount: undefined },
  });

  const handleCardPayment: SubmitHandler<CardPaymentFormValues> = async (data) => {
    if (!user) return;
    setIsLoading(true);
    setPaymentResult(null);
    const result = await makeCardPaymentAction({ ...data, businessAccountId: user.id });
    setIsLoading(false);
    setPaymentResult(result);
    if (result.success) {
      toast({ title: "Success!", description: result.message });
      cardForm.reset();
    } else {
      toast({ title: "Payment Failed", description: result.message, variant: "destructive" });
    }
  };

  const handleBarcodePayment: SubmitHandler<BarcodePaymentFormValues> = async (data) => {
    if (!user) return;
    setIsLoading(true);
    setPaymentResult(null);
    const result = await makeBarcodePaymentAction({ ...data, businessAccountId: user.id });
    setIsLoading(false);
    setPaymentResult(result);
    if (result.success) {
      toast({ title: "Success!", description: result.message });
      barcodeForm.reset();
      setIsBarcodeModalOpen(false);
    } else {
      toast({ title: "Payment Failed", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/business/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Business Dashboard
      </Link>
      <Card className="max-w-xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Make a Purchase</CardTitle>
          <CardDescription>Select payment method and enter details to process a transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentResult && (
            <Alert variant={paymentResult.success ? "default" : "destructive"} className={`mb-4 ${paymentResult.success ? 'bg-green-50 border-green-200 text-green-700' : ''}`}>
              {paymentResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertTitle>{paymentResult.success ? "Payment Successful" : "Payment Failed"}</AlertTitle>
              <AlertDescription>{paymentResult.message}</AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="card" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card"><CreditCard className="mr-2 h-4 w-4" />Card Payment</TabsTrigger>
              <TabsTrigger value="barcode"><QrCode className="mr-2 h-4 w-4" />Barcode Payment</TabsTrigger>
            </TabsList>
            <TabsContent value="card" className="pt-4">
              <Form {...cardForm}>
                <form onSubmit={cardForm.handleSubmit(handleCardPayment)} className="space-y-4">
                  <FormField control={cardForm.control} name="cardNumber" render={({ field }) => (
                    <FormItem><FormLabel>Card Number</FormLabel><FormControl><Input placeholder="Enter card number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={cardForm.control} name="expiryDate" render={({ field }) => (
                      <FormItem><FormLabel>Expiry (MM/YY)</FormLabel><FormControl><Input placeholder="MM/YY" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={cardForm.control} name="cvv" render={({ field }) => (
                      <FormItem><FormLabel>CVV</FormLabel><FormControl><Input type="password" placeholder="CVV" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={cardForm.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Enter amount" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Process Card Payment"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="barcode" className="pt-4">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Click the button below to open the barcode scanner input.</p>
                <Dialog open={isBarcodeModalOpen} onOpenChange={setIsBarcodeModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="w-full">
                      <ScanLine className="mr-2 h-5 w-5" /> Scan/Enter Barcode
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Barcode Payment</DialogTitle>
                      <DialogDescription>Enter the 8-digit barcode, CVV, and amount for the purchase.</DialogDescription>
                    </DialogHeader>
                    <Form {...barcodeForm}>
                      <form onSubmit={barcodeForm.handleSubmit(handleBarcodePayment)} className="space-y-4 py-4">
                        <FormField control={barcodeForm.control} name="barcode" render={({ field }) => (
                          <FormItem><FormLabel>8-Digit Barcode</FormLabel><FormControl><Input placeholder="Enter barcode" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={barcodeForm.control} name="cvv" render={({ field }) => (
                          <FormItem><FormLabel>Account CVV</FormLabel><FormControl><Input type="password" placeholder="CVV" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={barcodeForm.control} name="amount" render={({ field }) => (
                          <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Enter amount" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                          <Button type="button" variant="ghost" onClick={() => setIsBarcodeModalOpen(false)}>Cancel</Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Process Barcode Payment"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
