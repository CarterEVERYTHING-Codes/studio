
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { mockPendingTransfers, mockUsers } from "@/lib/mock-data";
import type { PendingTransfer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { approveTransferAction, rejectTransferAction } from "@/actions/userActions";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BellRing, Check, X, Loader2, AlertCircle, Info, User, History as HistoryIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function ReviewTransfersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [isLoadingMap, setIsLoadingMap] = useState<Record<string, boolean>>({}); // For individual button loading

  useEffect(() => {
    if (user) {
      const userPending = mockPendingTransfers.filter(
        pt => pt.recipientUserId === user.id && pt.status === "pending"
      );
      setPendingTransfers(userPending.sort((a,b) => new Date(b.initiatedDate).getTime() - new Date(a.initiatedDate).getTime()));
    }
  }, [user]);

  const handleManageTransfer = async (transferId: string, action: "approve" | "reject") => {
    if (!user) return;

    setIsLoadingMap(prev => ({ ...prev, [transferId]: true }));

    const result = action === "approve"
      ? await approveTransferAction({ transferId, actorUserId: user.id })
      : await rejectTransferAction({ transferId, actorUserId: user.id });

    setIsLoadingMap(prev => ({ ...prev, [transferId]: false }));

    if (result.success) {
      toast({
        title: `Transfer ${action === "approve" ? "Approved" : "Rejected"}!`,
        description: result.message,
      });
      // Refresh list
      const updatedPending = mockPendingTransfers.filter(
        pt => pt.recipientUserId === user.id && pt.status === "pending"
      );
      setPendingTransfers(updatedPending.sort((a,b) => new Date(b.initiatedDate).getTime() - new Date(a.initiatedDate).getTime()));
    } else {
      toast({
        title: `Failed to ${action} transfer`,
        description: result.message,
        variant: "destructive",
      });
    }
  };
  
  const getStatusBadgeVariant = (status: PendingTransfer['status']) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default'; // Success variant for Shadcn Badge typically uses primary color
      case 'rejected': return 'destructive';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };


  return (
    <div className="space-y-6">
      <Link href="/user/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </Link>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><BellRing className="text-primary"/> Review Incoming Transfers</CardTitle>
          <CardDescription>Approve or reject money transfers initiated by other users to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingTransfers.length === 0 ? (
            <div className="text-center py-8">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You have no pending incoming transfers to review at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTransfers.map((transfer) => (
                <Card key={transfer.id} className="bg-card hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">
                                Transfer Request from <span className="text-primary">{transfer.senderName}</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Initiated: {format(new Date(transfer.initiatedDate), "MMM dd, yyyy 'at' hh:mm a")}
                            </CardDescription>
                        </div>
                         <Badge variant={getStatusBadgeVariant(transfer.status)} className="capitalize text-xs h-fit">
                            {transfer.status}
                        </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-2xl font-semibold">${transfer.amount.toFixed(2)}</p>
                    {transfer.notes && <p className="text-sm text-muted-foreground italic">Note: "{transfer.notes}"</p>}
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageTransfer(transfer.id, "reject")}
                      disabled={isLoadingMap[transfer.id]}
                      className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      {isLoadingMap[transfer.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
                      Reject
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleManageTransfer(transfer.id, "approve")}
                      disabled={isLoadingMap[transfer.id]}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isLoadingMap[transfer.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                      Approve
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
       <Card className="mt-8 shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><HistoryIcon className="text-primary"/> Transfer History</CardTitle>
            <CardDescription>Overview of all transfers involving your account (sent or received, pending or resolved).</CardDescription>
        </CardHeader>
        <CardContent>
            {mockPendingTransfers.filter(pt => pt.senderUserId === user?.id || pt.recipientUserId === user?.id).length === 0 ? (
                 <p className="text-muted-foreground text-center py-4">No transfer history found.</p>
            ) : (
                <ul className="space-y-3">
                {mockPendingTransfers
                    .filter(pt => pt.senderUserId === user?.id || pt.recipientUserId === user?.id)
                    .sort((a,b) => new Date(b.initiatedDate).getTime() - new Date(a.initiatedDate).getTime())
                    .map(transfer => (
                    <li key={transfer.id} className="p-4 border rounded-md">
                        <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold">
                            {transfer.senderUserId === user?.id 
                                ? `Sent to ${mockUsers.find(u=>u.id === transfer.recipientUserId)?.name || transfer.recipientUsername}` 
                                : `Received from ${transfer.senderName}`}
                            : <span className="font-bold text-lg">${transfer.amount.toFixed(2)}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                            Initiated: {format(new Date(transfer.initiatedDate), "PPpp")}
                            {transfer.resolvedDate && ` | Resolved: ${format(new Date(transfer.resolvedDate), "PPpp")}`}
                            </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(transfer.status)} className="capitalize text-xs">{transfer.status}</Badge>
                        </div>
                        {transfer.notes && <p className="text-sm mt-1 text-muted-foreground italic">Notes: {transfer.notes}</p>}
                    </li>
                ))}
                </ul>
            )}
        </CardContent>
       </Card>
    </div>
  );
}

