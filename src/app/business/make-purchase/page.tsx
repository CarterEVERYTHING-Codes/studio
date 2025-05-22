
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
import { ArrowLeft, CreditCard, QrCode, Loader2, XCircle, CheckCircle, ScanLine, Camera, AlertTriangle, Info } from "lucide-react";
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

  const [showCardSummaryModal, setShowCardSummaryModal] = useState(false);
  const [currentOrderSummary, setCurrentOrderSummary] = useState<{
    itemCost: number;
    fee: number;
    total: number;
    cardData?: CardPaymentFormValues; 
  } | null>(null);

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
  
  const calculateClientServiceFee = (amount: number): number => {
    if (isNaN(amount) || amount <= 0) return 0;
    const fee = amount <= 50 ? amount * 0.05 : amount * 0.10;
    return parseFloat(fee.toFixed(2));
  };

  useEffect(() => {
    const videoElementForCleanup = videoRef.current; 

    if (!isScanModalOpen) {
      if (videoElementForCleanup && videoElementForCleanup.srcObject) {
        const stream = videoElementForCleanup.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoElementForCleanup.srcObject = null;
      }
      setHasCameraPermission(null); 
      return; 
    }

    const getCameraPermission = async () => {
      setHasCameraPermission(null); 
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
        if (videoRef.current) { 
          videoRef.current.srcObject = stream;
        } else { 
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

    return () => {
      if (videoElementForCleanup && videoElementForCleanup.srcObject) {
        const stream = videoElementForCleanup.srcObject as MediaStream;
        if (stream.getTracks().some(track => track.readyState === 'live')) {
             stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, [isScanModalOpen, toast]); 


  useEffect(() => {
    const videoElement = videoRef.current; 

    if (isScanModalOpen && hasCameraPermission === true && videoElement && videoElement.srcObject) {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }
      const readerInstance = codeReaderRef.current; 

      const startScan = () => {
        if (!readerInstance || !videoElement || !videoElement.srcObject) {
          return;
        }
        try {
          readerInstance.decodeFromVideoElement(videoElement, (result, error, controls) => {
            if (result) {
              scanConfirmForm.setValue('barcode', result.getText(), { shouldValidate: true });
              toast({ title: "Barcode Scanned!", description: `Code: ${result.getText()}` });
            }
            if (error) {
              if (!(error && error.name === 'NotFoundException')) { 
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
      
      const playAndScan = async () => {
        try {
            if (videoElement.paused) { 
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
            videoElement.removeEventListener('canplay', canPlayListener); 
        };
        videoElement.addEventListener('canplay', canPlayListener);
      }
    }

    return () => {
      if (codeReaderRef.current && typeof codeReaderRef.current.reset === 'function') {
        codeReaderRef.current.reset(); 
      } else if (codeReaderRef.current) {
        console.warn("Barcode scanner instance found, but 'reset' method is missing or not a function. Instance:", codeReaderRef.current);
      }
    };
  }, [isScanModalOpen, hasCameraPermission, scanConfirmForm, toast]); 

  const prepareCardSummary: SubmitHandler<CardPaymentFormValues> = (data) => {
    if (!user) return;
    const amount = data.amount;
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive amount for the purchase.", variant: "destructive"});
      return;
    }
  
    const fee = calculateClientServiceFee(amount);
    const total = parseFloat((amount + fee).toFixed(2));
  
    setCurrentOrderSummary({
      itemCost: amount,
      fee,
      total,
      cardData: data, 
    });
    setPaymentResult(null); 
    setShowCardSummaryModal(true);
  };
  
  const confirmAndProcessCardPayment = async () => {
    if (!user || !currentOrderSummary || !currentOrderSummary.cardData) return;
    setIsLoading(true);
    setPaymentResult(null); 
  
    const result = await makeCardPaymentAction({ ...currentOrderSummary.cardData, businessUserId: user.id });
    
    setIsLoading(false);
    setShowCardSummaryModal(false); 
    setCurrentOrderSummary(null); 
  
    setPaymentResult(result);
    if (result.success) {
      toast({ title: "Success!", description: result.message });
      cardForm.reset();
    } else {
      toast({ title: "Payment Failed", description: result.message, variant: "destructive" });
    }
  };


  const handlePurchaseDetailsSubmit: SubmitHandler<PurchaseDetailsFormValues> = (data) => {
    const amount = data.amount;
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid positive amount for the purchase.", variant: "destructive"});
        return;
    }
    setPaymentResult(null); 
    setCurrentPurchaseDetails(data);
    scanConfirmForm.reset(); 
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
      purchaseDetailsForm.reset(); 
      setIsScanModalOpen(false);
      setCurrentPurchaseDetails(null);
    } else {
      toast({ title: "Payment Failed", description: result.message, variant: "destructive" });
    }
  };
  
  const itemCostForBarcode = currentPurchaseDetails?.amount || 0;
  const serviceFeeForBarcode = calculateClientServiceFee(itemCostForBarcode);
  const totalChargeForBarcode = parseFloat((itemCostForBarcode + serviceFeeForBarcode).toFixed(2));


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
          <Tabs defaultValue="card" className="w-full" onValueChange={() => { setPaymentResult(null); cardForm.reset(); purchaseDetailsForm.reset(); setCurrentOrderSummary(null); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card"><CreditCard className="mr-2 h-4 w-4" />Card Payment</TabsTrigger>
              <TabsTrigger value="barcode"><QrCode className="mr-2 h-4 w-4" />Barcode Payment</TabsTrigger>
            </TabsList>
            <TabsContent value="card" className="pt-4">
              <Form {...cardForm}>
                <form onSubmit={cardForm.handleSubmit(prepareCardSummary)} className="space-y-4">
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
                  <Button type="submit" className="w-full" disabled={isLoading && showCardSummaryModal}>
                    {isLoading && showCardSummaryModal ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Review & Process Card Payment"}
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

      {/* Card Payment Summary Modal */}
      <Dialog open={showCardSummaryModal} onOpenChange={(open) => {
          if (!open) {
            setShowCardSummaryModal(false);
            setCurrentOrderSummary(null); 
          } else {
            setShowCardSummaryModal(true);
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/> Order Summary</DialogTitle>
            <DialogDescription>
              Please review the details before confirming the card payment.
            </DialogDescription>
          </DialogHeader>
          {currentOrderSummary && currentOrderSummary.cardData && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between text-sm">
                <span>Card Number:</span>
                <span className="font-medium font-mono">**** **** **** {currentOrderSummary.cardData.cardNumber.slice(-4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Item Cost:</span>
                <span className="font-medium">${currentOrderSummary.itemCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Service & Partner Fee:</span>
                <span className="font-medium">${currentOrderSummary.fee.toFixed(2)}</span>
              </div>
              <hr/>
              <div className="flex justify-between font-semibold text-md">
                <span>Total Charge:</span>
                <span>${currentOrderSummary.total.toFixed(2)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => {setShowCardSummaryModal(false); setCurrentOrderSummary(null);}} disabled={isLoading}>Cancel</Button>
            <Button type="button" onClick={confirmAndProcessCardPayment} disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scan Modal */}
      <Dialog open={isScanModalOpen} onOpenChange={(open) => {
          setIsScanModalOpen(open);
          if (!open) { 
            scanConfirmForm.reset(); 
          }
      }}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary"/> Scan Barcode & Confirm</DialogTitle>
             {currentPurchaseDetails && (
                <div className="text-sm text-muted-foreground space-y-1 pt-2">
                    <p>Purchase: <strong>{currentPurchaseDetails.purchaseName}</strong></p>
                    <p>Item Cost: <strong>${itemCostForBarcode.toFixed(2)}</strong></p>
                    <p>Service Fee: <span className="text-xs">( {itemCostForBarcode <= 50 ? '5%' : '10%'} )</span> <strong>${serviceFeeForBarcode.toFixed(2)}</strong></p>
                    <p className="font-semibold">Total Charge: <strong>${totalChargeForBarcode.toFixed(2)}</strong></p>
                    <hr className="my-2"/>
                    <p>Scan barcode or enter manually with CVV below.</p>
                </div>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Camera Preview</label>
              <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {hasCameraPermission === null && ( 
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-2 text-sm text-muted-foreground">Accessing camera...</p>
                  </div>
                )}
              </div>
              
              {hasCameraPermission === false && ( 
                <Alert variant="destructive" className="mt-2">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Camera Access Denied/Unavailable</AlertTitle>
                  <AlertDescription>
                    Could not access the camera. Please ensure permissions are granted or enter the barcode manually.
                  </AlertDescription>
                </Alert>
              )}
              {hasCameraPermission === true && ( 
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
              <form onSubmit={scanConfirmForm.handleSubmit(handleBarcodePayment)} className="space-y-4" id="barcodePaymentForm">
                <FormField control={scanConfirmForm.control} name="barcode" render={({ field }) => (
                  <FormItem><FormLabel>Customer's 8-Digit Barcode</FormLabel><FormControl><Input placeholder="Scanned or enter manually" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={scanConfirmForm.control} name="cvv" render={({ field }) => (
                  <FormItem><FormLabel>Customer's Account CVV</FormLabel><FormControl><Input type="password" placeholder="CVV" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </form>
            </Form>
          </div>
          <DialogFooter className="p-6 pt-2 border-t flex-shrink-0 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsScanModalOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              form="barcodePaymentForm"
              disabled={isLoading || (isScanModalOpen && hasCameraPermission === null) }>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Process Barcode Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

