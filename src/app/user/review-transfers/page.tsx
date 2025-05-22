
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { mockPendingTransfers, mockUsers } from "@/lib/mock-data";
import type { PendingTransfer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { approveTransferAction, rejectTransferAction, cancelMyInitiatedItemAction } from "@/actions/userActions";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BellRing, Check, X, Loader2, Info, User, History as HistoryIcon, Ban, RefreshCcw } from "lucide-react";
import { LoadingLink } from "@/components/shared/LoadingLink"; // Changed import
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";


export default function ReviewTransfersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transfersToApprove, setTransfersToApprove] = useState<PendingTransfer[]>([]); // Incoming transfers for me to approve
  const [paymentRequestsToPay, setPaymentRequestsToPay] = useState<PendingTransfer[]>([]); // Money requests for me to pay
  const [myInitiatedPendingItems, setMyInitiatedPendingItems] = useState<PendingTransfer[]>([]); // Transfers/Requests I started, that are still pending
  const [transferHistory, setTransferHistory] = useState<PendingTransfer[]>([]);
  const [isLoadingMap, setIsLoadingMap] = useState<Record<string, boolean>>({});

  const refreshData = () => {
    if (user) {
      const allUserItems = mockPendingTransfers.filter(pt => pt.recipientUserId === user.id || pt.senderUserId === user.id);
      allUserItems.sort((a,b) => new Date(b.initiatedDate).getTime() - new Date(a.initiatedDate).getTime());
      
      setTransferHistory(allUserItems);

      setTransfersToApprove(
        allUserItems.filter(pt => pt.recipientUserId === user.id && pt.status === "pending" && pt.notes?.includes("Transfer from"))
      );
      setPaymentRequestsToPay(
        allUserItems.filter(pt => pt.senderUserId === user.id && pt.status === "pending" && pt.notes?.includes("Money request from"))
      );
      setMyInitiatedPendingItems(
        allUserItems.filter(pt => pt.status === "pending" && 
          ((pt.senderUserId === user.id && pt.notes?.includes("Transfer from")) || // I initiated a transfer
           (pt.recipientUserId === user.id && pt.notes?.includes("Money request from"))) // I initiated a request
        )
      );
    } else {
      setTransfersToApprove([]);
      setPaymentRequestsToPay([]);
      setMyInitiatedPendingItems([]);
      setTransferHistory([]);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  const handleManageAction = async (transferId: string, actionType: "approve" | "reject" | "cancel") => {
    if (!user) return;
    setIsLoadingMap(prev => ({ ...prev, [transferId]: true }));

    let result;
    if (actionType === "cancel") {
        result = await cancelMyInitiatedItemAction({ transferId, actorUserId: user.id });
    } else if (actionType === "approve") {
        result = await approveTransferAction({ transferId, actorUserId: user.id });
    } else { // reject
        result = await rejectTransferAction({ transferId, actorUserId: user.id });
    }
    
    setIsLoadingMap(prev => ({ ...prev, [transferId]: false }));

    if (result.success) {
      toast({ title: "Success!", description: result.message });
      refreshData();
    } else {
      toast({ title: "Action Failed", description: result.message, variant: "destructive" });
    }
  };
  
  const getStatusBadgeVariant = (status: PendingTransfer['status']) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'failed': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const renderPendingItemCard = (item: PendingTransfer, type: "transfer_to_approve" | "request_to_pay" | "my_initiated") => {
    const isMyInitiated = type === "my_initiated";
    let title = "";
    let subDescription = `Amount: $${item.amount.toFixed(2)}`;

    if (type === "transfer_to_approve") {
        title = `Incoming Transfer from ${item.senderName}`;
    } else if (type === "request_to_pay") {
        title = `Payment Request from ${item.recipientUsername}`; // recipientUsername is the requester
    } else { // my_initiated
        if (item.notes?.includes("Transfer from")) { // I sent a transfer
            title = `Your Transfer to ${item.recipientUsername}`;
            subDescription += ` (Awaiting their approval)`;
        } else { // I sent a request
            title = `Your Request to ${item.senderName}`; // senderName is the payer
            subDescription += ` (Awaiting their payment)`;
        }
    }


    return (
        <Card key={item.id} className="bg-card hover:shadow-md transition-shadow">
            <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        Initiated: {format(new Date(item.initiatedDate), "MMM dd, yyyy 'at' hh:mm a")}
                    </CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(item.status)} className="capitalize text-xs h-fit">
                    {item.status}
                </Badge>
            </div>
            </CardHeader>
            <CardContent className="space-y-1">
                <p className="text-2xl font-semibold">${item.amount.toFixed(2)}</p>
                {item.notes && <p className="text-sm text-muted-foreground italic">Note: "{item.notes}"</p>}
            </CardContent>
            <CardFooter className="flex justify-end space-x-3">
                {!isMyInitiated && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageAction(item.id, "reject")}
                            disabled={isLoadingMap[item.id]}
                            className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                            {isLoadingMap[item.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
                            Reject
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleManageAction(item.id, "approve")}
                            disabled={isLoadingMap[item.id]}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isLoadingMap[item.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                            {type === "request_to_pay" ? "Pay Request" : "Approve Transfer"}
                        </Button>
                    </>
                )}
                {isMyInitiated && item.status === "pending" && (
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageAction(item.id, "cancel")}
                        disabled={isLoadingMap[item.id]}
                    >
                        {isLoadingMap[item.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="mr-1 h-4 w-4" />}
                        Cancel {item.notes?.includes("Transfer from") ? "Transfer" : "Request"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <LoadingLink href="/user/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </LoadingLink>
      <Button onClick={refreshData} variant="outline" size="sm" className="mb-4">
        <RefreshCcw className="mr-2 h-4 w-4"/> Refresh Data
      </Button>

      {/* Section for Incoming Transfers to Approve */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><BellRing className="text-primary"/> Incoming Transfers to Approve</CardTitle>
          <CardDescription>Approve or reject money transfers initiated by other users to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {transfersToApprove.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No incoming transfers awaiting your approval.</p>
          ) : (
            <div className="space-y-4">
              {transfersToApprove.map(item => renderPendingItemCard(item, "transfer_to_approve"))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-8"/>

      {/* Section for Payment Requests to Pay */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><User className="text-primary"/> Payment Requests for You</CardTitle>
          <CardDescription>Approve (pay) or reject money requests made to you by other users.</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentRequestsToPay.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No payment requests awaiting your action.</p>
          ) : (
            <div className="space-y-4">
              {paymentRequestsToPay.map(item => renderPendingItemCard(item, "request_to_pay"))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Separator className="my-8"/>

      {/* Section for My Initiated Pending Items (to cancel) */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><Info className="text-primary"/> Your Pending Initiated Items</CardTitle>
          <CardDescription>Transfers you sent or requests you made that are still awaiting action from the other party. You can cancel them here.</CardDescription>
        </CardHeader>
        <CardContent>
          {myInitiatedPendingItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">You have no self-initiated items currently pending action.</p>
          ) : (
            <div className="space-y-4">
              {myInitiatedPendingItems.map(item => renderPendingItemCard(item, "my_initiated"))}
            </div>
          )}
        </CardContent>
      </Card>


       <Separator className="my-8"/>

       <Card className="mt-8 shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><HistoryIcon className="text-primary"/> Full Interaction History</CardTitle>
            <CardDescription>Overview of all transfers and requests involving your account.</CardDescription>
        </CardHeader>
        <CardContent>
            {transferHistory.length === 0 ? (
                 <p className="text-muted-foreground text-center py-4">No interaction history found.</p>
            ) : (
                <ul className="space-y-3 max-h-[500px] overflow-y-auto">
                {transferHistory.map(item => {
                    let description = "";
                    const isSender = item.senderUserId === user?.id;
                    const isRecipient = item.recipientUserId === user?.id;
                    const otherPartyName = isSender ? item.recipientUsername : item.senderName;

                    if (item.notes?.includes("Transfer from")) { // It's a standard transfer
                        description = isSender 
                            ? `Sent transfer to ${otherPartyName}` 
                            : `Received transfer from ${otherPartyName}`;
                    } else if (item.notes?.includes("Money request from")) { // It's a money request
                        description = isRecipient // I (recipient) initiated the request
                            ? `Requested money from ${otherPartyName}` 
                            : `Money requested from you by ${otherPartyName}`;
                    } else {
                        description = `Interaction with ${otherPartyName}`; // Fallback
                    }

                    return (
                        <li key={item.id} className="p-4 border rounded-md bg-muted/30">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">
                                    {description}: <span className="font-bold text-lg">${item.amount.toFixed(2)}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                    Initiated: {format(new Date(item.initiatedDate), "PPpp")}
                                    {item.resolvedDate && ` | Resolved: ${format(new Date(item.resolvedDate), "PPpp")}`}
                                    </p>
                                     {item.notes && <p className="text-xs mt-1 text-muted-foreground italic">System Note: {item.notes}</p>}
                                </div>
                                <Badge variant={getStatusBadgeVariant(item.status)} className="capitalize text-xs h-fit whitespace-nowrap">
                                    {item.status}
                                    {item.status === 'pending' && item.senderUserId === user?.id && item.notes?.includes("Money request from") && " (Your Action Required)"}
                                    {item.status === 'pending' && item.recipientUserId === user?.id && item.notes?.includes("Transfer from") && " (Your Action Required)"}
                                </Badge>
                            </div>
                        </li>
                    );
                })}
                </ul>
            )}
        </CardContent>
       </Card>
    </div>
  );
}
