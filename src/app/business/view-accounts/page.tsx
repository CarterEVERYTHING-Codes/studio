
"use client";

import { useState, useEffect } from "react";
import type { Account, User } from "@/lib/types";
import { mockAccounts, mockUsers } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users as UsersIcon, CreditCard, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface DisplayAccount extends Account {
  userRole?: User['role'];
}

export default function ViewUserAccountsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedAccounts, setDisplayedAccounts] = useState<DisplayAccount[]>([]);

  useEffect(() => {
    // Prepare accounts with user role information, filtering for 'user' roles
    const userAccounts = mockAccounts
      .map(acc => {
        const user = mockUsers.find(u => u.id === acc.userId);
        return { ...acc, userRole: user?.role };
      })
      .filter(acc => acc.userRole === 'user'); // Only show actual user accounts

    const filtered = userAccounts.filter(
      (acc) =>
        acc.accountHolderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setDisplayedAccounts(filtered);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <Link href="/business/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Business Dashboard
      </Link>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><UsersIcon className="text-primary"/> User Accounts Overview</CardTitle>
          <CardDescription>
            View a list of user accounts. For managing funds, please use the "Manage Funds" section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by name, email, or account ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {displayedAccounts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Holder</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Card (Last 4)</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">{acc.accountHolderName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                           <Mail className="h-3 w-3 text-muted-foreground"/> {acc.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {acc.phoneNumber ? (
                             <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground"/> {acc.phoneNumber}
                             </div>
                        ) : <span className="text-muted-foreground italic">N/A</span>}
                       
                        </TableCell>
                      <TableCell className="font-mono text-xs">{acc.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                           <CreditCard className="h-3 w-3 text-muted-foreground"/> {acc.cardNumber.slice(-4)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">${acc.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No user accounts match your search or none available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
