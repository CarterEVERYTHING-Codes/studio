
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserRole } from "@/lib/types";
import { CheckCircle, Info } from "lucide-react";

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
}

export function TutorialModal({ isOpen, onClose, userRole }: TutorialModalProps) {
  if (userRole === 'admin') {
    return null; // Admins do not see the tutorial
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Info className="text-primary h-6 w-6" />
            Campus CashFlow Beginner's Guide
          </DialogTitle>
          <DialogDescription>
            Welcome! Here’s a quick guide to get you started.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-4 -mr-2 my-4">
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-lg text-primary">General Tips:</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Your current balance is usually displayed prominently on your dashboard.</li>
              <li>Keep your login details secure and do not share your password.</li>
              <li>Use the "Report Bug" button in the header if you encounter issues.</li>
            </ul>

            {userRole === 'user' && (
              <>
                <h3 className="font-semibold text-lg text-primary mt-6">For Students & Staff (User Accounts):</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="font-medium text-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> View Card Info:</dt>
                    <dd className="pl-5 text-muted-foreground">See your digital card number, CVV, expiry, and payment barcode. Useful for online or in-app purchases if supported.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> View Transactions:</dt>
                    <dd className="pl-5 text-muted-foreground">Check your history of payments, transfers, and deposits.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> View Balance:</dt>
                    <dd className="pl-5 text-muted-foreground">A quick overview of your funds and recent financial activity summaries.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> Transfer Money:</dt>
                    <dd className="pl-5 text-muted-foreground">Send funds to another user. They must approve the transfer before funds are moved.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> Request Money:</dt>
                    <dd className="pl-5 text-muted-foreground">Ask another user to send you funds. They will need to approve your payment request.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> Review Pending Items:</dt>
                    <dd className="pl-5 text-muted-foreground">Approve or reject incoming transfers or payment requests from others. You can also cancel pending transfers/requests you initiated.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> Card Settings:</dt>
                    <dd className="pl-5 text-muted-foreground">Manage your username, password, re-issue your card, freeze card purchases, set transaction limits, and enable/disable barcode payments.</dd>
                  </div>
                </dl>
              </>
            )}

            {userRole === 'business' && (
              <>
                <h3 className="font-semibold text-lg text-primary mt-6">For Business Accounts:</h3>
                 <dl className="space-y-3">
                  <div>
                    <dt className="font-medium text-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> Make Purchase:</dt>
                    <dd className="pl-5 text-muted-foreground">Charge customers for goods or services using their card or by scanning their 8-digit barcode (with CVV). Fees apply to the customer and are collected by the Main Admin.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> Manage Money:</dt>
                    <dd className="pl-5 text-muted-foreground">Review your sales history and see your current business account balance.</dd>
                  </div>
                </dl>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4">
          <Button onClick={onClose}>Got it, thanks!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
