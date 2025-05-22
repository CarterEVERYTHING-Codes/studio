
"use client"; 

import { useState, useEffect } from "react";
import type { Account, User } from "@/lib/types";
import { mockAccounts, mockUsers, MAIN_ADMIN_USER_ID } from "@/lib/mock-data"; // Added MAIN_ADMIN_USER_ID
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users as UsersIcon, CreditCard, Mail, Phone, Shield, Briefcase, Lock, CalendarDays, QrCode } from "lucide-react";
import { LoadingLink } from "@/components/shared/LoadingLink"; // Changed import
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth"; // Import useAuth

interface DisplayAccount extends Account {
  userRole?: User['role'];
  username?: User['username'];
}

export default function AdminViewAccountsPage() {
  const { user } = useAuth(); // Get current authenticated user
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedAccounts, setDisplayedAccounts] = useState<DisplayAccount[]>([]);
  
  const isMainAdmin = user?.id === MAIN_ADMIN_USER_ID;

  useEffect(() => {
    const allSystemAccounts = mockAccounts.map(acc => {
      const linkedUser = mockUsers.find(u => u.id === acc.userId);
      return { ...acc, userRole: linkedUser?.role, username: linkedUser?.username };
    });

    const filtered = allSystemAccounts.filter(
      (acc) =>
        acc.accountHolderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.username && acc.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (acc.userRole && acc.userRole.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (isMainAdmin && ( // Allow main admin to search by full card details if they are visible
            acc.cardNumber.includes(searchTerm) ||
            acc.cvv.includes(searchTerm) ||
            acc.expiryDate.includes(searchTerm) ||
            acc.barcode.includes(searchTerm)
        ))
    );
    setDisplayedAccounts(filtered);
  }, [searchTerm, isMainAdmin, user]); // Added user to dependencies to re-evaluate isMainAdmin if user changes

  const getRoleIcon = (role?: User['role']) => {
    if (role === 'admin') return <Shield className="h-4 w-4 text-red-500" />;
    if (role === 'business') return <Briefcase className="h-4 w-4 text-blue-500" />;
    if (role === 'user') return <UsersIcon className="h-4 w-4 text-green-500" />;
    return <UsersIcon className="h-4 w-4 text-muted-foreground" />;
  }

  return (
    <div className="space-y-6">
      <LoadingLink href="/admin/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Admin Dashboard
      </LoadingLink>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><UsersIcon className="text-primary"/> All System Accounts</CardTitle>
          <CardDescription>
            View and search all accounts (User, Business, Admin) in the system.
            {isMainAdmin && " Full card details are visible to Main Admin."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by name, email, ID, username, role, card details (Main Admin)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          {displayedAccounts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Holder/Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Card Number</TableHead>
                    {isMainAdmin && (
                      <>
                        <TableHead>CVV</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Barcode</TableHead>
                      </>
                    )}
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">{acc.accountHolderName}</TableCell>
                      <TableCell>
                        <Badge variant={
                            acc.userRole === 'admin' ? 'destructive' :
                            acc.userRole === 'business' ? 'secondary' : 'default'
                        } className="capitalize flex items-center gap-1">
                           {getRoleIcon(acc.userRole)} {acc.userRole || 'N/A'}
                        </Badge>
                      </TableCell>
                       <TableCell className="font-mono text-xs">{acc.username || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
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
                        <div className="flex items-center gap-1 font-mono text-xs">
                           <CreditCard className="h-3 w-3 text-muted-foreground"/> 
                           {isMainAdmin ? acc.cardNumber : `**** **** **** ${acc.cardNumber.slice(-4)}`}
                        </div>
                      </TableCell>
                      {isMainAdmin && (
                        <>
                          <TableCell>
                            <div className="flex items-center gap-1 font-mono text-xs">
                              <Lock className="h-3 w-3 text-muted-foreground"/> {acc.cvv}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 font-mono text-xs">
                              <CalendarDays className="h-3 w-3 text-muted-foreground"/> {acc.expiryDate}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 font-mono text-xs">
                              <QrCode className="h-3 w-3 text-muted-foreground"/> {acc.barcode}
                            </div>
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-right font-semibold">${acc.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No accounts match your search criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
