
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { makeCardPaymentAction, makeBarcodePaymentAction } from "@/actions/businessActions";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, CreditCard, QrCode, Loader2, XCircle, CheckCircle, ScanLine, Camera } from "lucide-react";
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

// Schema for initial purchase details (barcode flow)
const purchaseDetailsSchema = z.object({
  purchaseName: z.string().min(1, "Purchase name is required (e.g., Coffee, Books)."),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Amount must be a number." })
      .positive("Amount must be a positive number.")
  ),
});
type PurchaseDetailsFormValues = z.infer<typeof purchaseDetailsSchema>;

// Schema for barcode and CVV (barcode flow - in dialog)
const scanConfirmSchema = z.object({
  barcode: z.string().length(8, "Barcode must be 8 digits.").regex(/^\d+$/, "Barcode must be digits"),
  cvv: z.string().min(3, "CVV must be 3-4 digits").max(4, "CVV must be 3-4 digits").regex(/^\d+$/, "CVV must be digits"),
});
type ScanConfirmFormValues = z.infer<typeof scanConfirmSchema>;

export default function MakePurchasePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{success: boolean, message: string} | null>(null);
  
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [currentPurchaseDetails, setCurrentPurchaseDetails] = useState<{ purchaseName: string; amount: number } | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null); // null: checking, true: granted, false: denied/unavailable
  const videoRef = useRef<HTMLVideoElement>(null);

  const cardForm = useForm<CardPaymentFormValues>({
    resolver: zodResolver(cardPaymentSchema),
    defaultValues: { cardNumber: "", expiryDate: "", cvv: "", amount: undefined },
  });

  const purchaseDetailsForm = useForm<PurchaseDetailsFormValues>({
    resolver: zodResolver(purchaseDetailsSchema),
    defaultValues: { purchaseName: "", amount: undefined },
  });

  const scanConfirmForm = useForm<ScanConfirmFormValues>({
    resolver: zodResolver(scanConfirmSchema),
    defaultValues: { barcode: "", cvv: "" },
  });

  useEffect(() => {
    if (!isScanModalOpen) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setHasCameraPermission(null); // Reset permission status when modal is closed
      return;
    }

    const getCameraPermission = async () => {
      setHasCameraPermission(null); // Set to checking state
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          variant: 'destructive',
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access. Please enter barcode manually.',
        });
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        // Toast is shown by the Alert component conditionally rendered based on hasCameraPermission
      }
    };

    getCameraPermission();

    return () => { // Cleanup function
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isScanModalOpen]); // Removed toast from dependencies as it's stable

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

  const handlePurchaseDetailsSubmit: SubmitHandler<PurchaseDetailsFormValues> = (data) => {
    setPaymentResult(null); 
    setCurrentPurchaseDetails(data);
    scanConfirmForm.reset(); 
    setIsScanModalOpen(true); // This will trigger the useEffect for camera
  };

  const handleBarcodePayment: SubmitHandler<ScanConfirmFormValues> = async (scanData) => {
    if (!user || !currentPurchaseDetails) return;
    setIsLoading(true);
    setPaymentResult(null);
    const result = await makeBarcodePaymentAction({
      ...scanData,
      purchaseName: currentPurchaseDetails.purchaseName,
      amount: currentPurchaseDetails.amount,
      businessAccountId: user.id
    });
    setIsLoading(false);
    setPaymentResult(result);
    if (result.success) {
      toast({ title: "Success!", description: result.message });
      scanConfirmForm.reset();
      purchaseDetailsForm.reset();
      setIsScanModalOpen(false);
      setCurrentPurchaseDetails(null);
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
          <Tabs defaultValue="card" className="w-full" onValueChange={() => setPaymentResult(null)}>
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
              <Form {...purchaseDetailsForm}>
                <form onSubmit={purchaseDetailsForm.handleSubmit(handlePurchaseDetailsSubmit)} className="space-y-4">
                  <FormField control={purchaseDetailsForm.control} name="purchaseName" render={({ field }) => (
                    <FormItem><FormLabel>Purchase Name</FormLabel><FormControl><Input placeholder="e.g., Lunch, Books" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={purchaseDetailsForm.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Enter total amount" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full">
                    <ScanLine className="mr-2 h-5 w-5" /> Proceed to Scan/Enter Barcode
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isScanModalOpen} onOpenChange={setIsScanModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary"/> Scan Barcode & Confirm</DialogTitle>
            {currentPurchaseDetails && (
              <DialogDescription>
                Confirming purchase for: <strong>{currentPurchaseDetails.purchaseName}</strong> - Total: <strong>${currentPurchaseDetails.amount.toFixed(2)}</strong>.
                Scan the barcode or enter it manually along with the CVV.
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="my-4 space-y-2">
            <label className="text-sm font-medium">Camera Preview</label>
            {/* Video element container */}
            <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              {/* Overlay for loading state */}
              {hasCameraPermission === null && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Alert for camera permission status */}
            {hasCameraPermission === false && (
              <Alert variant="destructive" className="mt-2">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Camera Access Denied/Unavailable</AlertTitle>
                <AlertDescription>
                  Could not access the camera. Please ensure permissions are granted in your browser settings and try again, or enter the barcode manually.
                </AlertDescription>
              </Alert>
            )}
             {hasCameraPermission === null && isScanModalOpen && (
                 <Alert variant="default" className="mt-2 border-primary/20 text-primary bg-primary/10">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertTitle>Accessing Camera</AlertTitle>
                    <AlertDescription>
                      Attempting to access your camera. Please grant permission if prompted.
                    </AlertDescription>
                </Alert>
            )}
          </div>

          <Form {...scanConfirmForm}>
            <form onSubmit={scanConfirmForm.handleSubmit(handleBarcodePayment)} className="space-y-4">
              <FormField control={scanConfirmForm.control} name="barcode" render={({ field }) => (
                <FormItem><FormLabel>8-Digit Barcode</FormLabel><FormControl><Input placeholder="Enter barcode manually" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={scanConfirmForm.control} name="cvv" render={({ field }) => (
                <FormItem><FormLabel>Account CVV</FormLabel><FormControl><Input type="password" placeholder="CVV" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsScanModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading || (isScanModalOpen && hasCameraPermission === null) }>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Process Barcode Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


