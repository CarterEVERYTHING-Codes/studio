
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
import { BrowserMultiFormatReader } from '@zxing/browser';

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

const purchaseDetailsSchema = z.object({
  purchaseName: z.string().min(1, "Purchase name is required (e.g., Coffee, Books)."),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: "Amount must be a number." })
      .positive("Amount must be a positive number.")
  ),
});
type PurchaseDetailsFormValues = z.infer<typeof purchaseDetailsSchema>;

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
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

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
    const videoElementForCleanup = videoRef.current; 

    if (!isScanModalOpen) {
      if (videoElementForCleanup && videoElementForCleanup.srcObject) {
        const stream = videoElementForCleanup.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoElementForCleanup.srcObject = null;
      }
      setHasCameraPermission(null); // Reset camera permission status when modal closes
      return; 
    }

    // This effect runs when isScanModalOpen becomes true
    const getCameraPermission = async () => {
      setHasCameraPermission(null); // Indicate loading state for permission
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { // Check if videoRef is still current (modal might have closed quickly)
          videoRef.current.srcObject = stream;
        } else { // If modal closed before stream assigned, stop tracks
          stream.getTracks().forEach(track => track.stop());
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use the scanner, or enter manually.',
        });
      }
    };

    getCameraPermission();

    // Cleanup for this specific effect instance when modal closes or component unmounts
    return () => {
      if (videoElementForCleanup && videoElementForCleanup.srcObject) {
        const stream = videoElementForCleanup.srcObject as MediaStream;
        // Ensure tracks are live before stopping to avoid errors if already stopped
        if (stream.getTracks().some(track => track.readyState === 'live')) {
             stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, [isScanModalOpen, toast]); // Only re-run if isScanModalOpen or toast changes


  useEffect(() => {
    const videoElement = videoRef.current; // Capture for cleanup

    if (isScanModalOpen && hasCameraPermission === true && videoElement && videoElement.srcObject) {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }
      const readerInstance = codeReaderRef.current; // Capture for use in this effect

      const startScan = () => {
        // Guard against calling decodeFromVideoElement if reader or videoElement is not ready
        if (!readerInstance || !videoElement || !videoElement.srcObject) {
          // console.warn("Attempted to start scan without ready reader or video element.");
          return;
        }
        try {
          readerInstance.decodeFromVideoElement(videoElement, (result, error, controls) => {
            if (result) {
              scanConfirmForm.setValue('barcode', result.getText(), { shouldValidate: true });
              toast({ title: "Barcode Scanned!", description: `Code: ${result.getText()}` });
              // Optionally, stop scanning after first successful scan: controls.stop();
            }
            if (error) {
              if (!(error && error.name === 'NotFoundException')) { // Ignore NotFoundException, it's common
                console.warn('Barcode scanning error:', error);
              }
            }
          });
        } catch (scanError) {
          console.error("Error starting barcode scanning process:", scanError);
          toast({
            variant: 'destructive',
            title: 'Scanner Start Error',
            description: 'Could not initiate scanner. Please try manual entry.',
          });
        }
      };
      
      // Ensure video is playing before attempting to scan
      const playAndScan = async () => {
        try {
            if (videoElement.paused) { // Only play if paused
                await videoElement.play();
            }
            startScan();
        } catch (e) {
            console.error("Error playing video for scan:", e);
            toast({ variant: 'destructive', title: 'Video Playback Error', description: 'Could not play video for scanning.' });
        }
      };

      if (videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA) {
        playAndScan();
      } else {
        const canPlayListener = () => {
            playAndScan();
            videoElement.removeEventListener('canplay', canPlayListener); // Clean up listener
        };
        videoElement.addEventListener('canplay', canPlayListener);
      }
    }

    // Cleanup function for this effect
    return () => {
      if (codeReaderRef.current && typeof codeReaderRef.current.reset === 'function') {
        codeReaderRef.current.reset(); // This should stop scanning and release camera
      } else if (codeReaderRef.current) {
        // Fallback logging if reset is not a function for some reason
        console.warn("Barcode scanner instance found, but 'reset' method is missing or not a function. Instance:", codeReaderRef.current);
      }
      // Note: The camera stream itself (videoRef.current.srcObject) is managed by readerInstance.reset()
      // or by the cleanup in the first useEffect if the scanner wasn't initialized.
    };
  }, [isScanModalOpen, hasCameraPermission, scanConfirmForm, toast]); // Dependencies


  const handleCardPayment: SubmitHandler<CardPaymentFormValues> = async (data) => {
    if (!user) return;
    setIsLoading(true);
    setPaymentResult(null);
    const result = await makeCardPaymentAction({ ...data, businessUserId: user.id });
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
    setPaymentResult(null); // Clear previous payment results
    setCurrentPurchaseDetails(data);
    scanConfirmForm.reset(); // Reset barcode/cvv form for new scan
    setIsScanModalOpen(true);
  };

  const handleBarcodePayment: SubmitHandler<ScanConfirmFormValues> = async (scanData) => {
    if (!user || !currentPurchaseDetails) return;
    setIsLoading(true);
    setPaymentResult(null);
    const result = await makeBarcodePaymentAction({
      ...scanData,
      purchaseName: currentPurchaseDetails.purchaseName,
      amount: currentPurchaseDetails.amount,
      businessUserId: user.id
    });
    setIsLoading(false);
    setPaymentResult(result);
    if (result.success) {
      toast({ title: "Success!", description: result.message });
      scanConfirmForm.reset();
      purchaseDetailsForm.reset(); // Also reset the main purchase details form
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
          <CardDescription>Select payment method and enter details to process a transaction for a customer.</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentResult && (
            <Alert variant={paymentResult.success ? "default" : "destructive"} className={`mb-4 ${paymentResult.success ? 'bg-green-50 border-green-200 text-green-700' : ''}`}>
              {paymentResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertTitle>{paymentResult.success ? "Payment Successful" : "Payment Failed"}</AlertTitle>
              <AlertDescription>{paymentResult.message}</AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="card" className="w-full" onValueChange={() => { setPaymentResult(null); cardForm.reset(); purchaseDetailsForm.reset(); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card"><CreditCard className="mr-2 h-4 w-4" />Card Payment</TabsTrigger>
              <TabsTrigger value="barcode"><QrCode className="mr-2 h-4 w-4" />Barcode Payment</TabsTrigger>
            </TabsList>
            <TabsContent value="card" className="pt-4">
              <Form {...cardForm}>
                <form onSubmit={cardForm.handleSubmit(handleCardPayment)} className="space-y-4">
                  <FormField control={cardForm.control} name="cardNumber" render={({ field }) => (
                    <FormItem><FormLabel>Customer Card Number</FormLabel><FormControl><Input placeholder="Enter card number" {...field} /></FormControl><FormMessage /></FormItem>
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
                    <FormItem><FormLabel>Purchase Amount ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Enter amount" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>
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
                    <FormItem><FormLabel>Purchase Name/Description</FormLabel><FormControl><Input placeholder="e.g., Lunch, Books" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={purchaseDetailsForm.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Purchase Amount ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Enter total amount" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/></FormControl><FormMessage /></FormItem>
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

      <Dialog open={isScanModalOpen} onOpenChange={(open) => {
          setIsScanModalOpen(open);
          if (!open) { // When dialog is closed
            scanConfirmForm.reset(); // Clear scan form fields
            // Camera and scanner cleanup is handled by useEffect hooks
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary"/> Scan Barcode & Confirm</DialogTitle>
            {currentPurchaseDetails && (
              <DialogDescription>
                Confirming purchase for: <strong>{currentPurchaseDetails.purchaseName}</strong> - Item Cost: <strong>${currentPurchaseDetails.amount.toFixed(2)}</strong>.
                The camera will attempt to scan the barcode. You can also enter it manually along with the CVV.
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="my-4 space-y-2">
            <label className="text-sm font-medium">Camera Preview</label>
            <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative">
              {/* Video element is always rendered when modal is open to ensure consistency */}
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              
              {hasCameraPermission === null && ( // Loading state
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="ml-2 text-sm text-muted-foreground">Accessing camera...</p>
                </div>
              )}
            </div>
            
            {hasCameraPermission === false && ( // Permission denied or error
              <Alert variant="destructive" className="mt-2">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Camera Access Denied/Unavailable</AlertTitle>
                <AlertDescription>
                  Could not access the camera. Please ensure permissions are granted or enter the barcode manually.
                </AlertDescription>
              </Alert>
            )}
            {hasCameraPermission === true && ( // Permission granted
                 <Alert variant="default" className="mt-2 border-primary/20 text-primary bg-primary/10">
                    <ScanLine className="h-4 w-4" />
                    <AlertTitle>Scanning Active</AlertTitle>
                    <AlertDescription>
                      Point the customer's barcode at the camera. Manual entry is also available below.
                    </AlertDescription>
                </Alert>
            )}
          </div>

          <Form {...scanConfirmForm}>
            <form onSubmit={scanConfirmForm.handleSubmit(handleBarcodePayment)} className="space-y-4">
              <FormField control={scanConfirmForm.control} name="barcode" render={({ field }) => (
                <FormItem><FormLabel>Customer's 8-Digit Barcode</FormLabel><FormControl><Input placeholder="Scanned or enter manually" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={scanConfirmForm.control} name="cvv" render={({ field }) => (
                <FormItem><FormLabel>Customer's Account CVV</FormLabel><FormControl><Input type="password" placeholder="CVV" {...field} /></FormControl><FormMessage /></FormItem>
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

