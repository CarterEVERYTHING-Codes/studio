
"use client"; // This page is moved from business to admin

import { useState, useEffect } from "react";
import type { Account, User } from "@/lib/types";
import { mockAccounts, mockUsers } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users as UsersIcon, CreditCard, Mail, Phone, Shield, Briefcase } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface DisplayAccount extends Account {
  userRole?: User['role'];
  username?: User['username'];
}

export default function AdminViewAccountsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedAccounts, setDisplayedAccounts] = useState<DisplayAccount[]>([]);

  useEffect(() => {
    // Admins can see all accounts
    const allSystemAccounts = mockAccounts.map(acc => {
      const user = mockUsers.find(u => u.id === acc.userId);
      return { ...acc, userRole: user?.role, username: user?.username };
    });

    const filtered = allSystemAccounts.filter(
      (acc) =>
        acc.accountHolderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.username && acc.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (acc.userRole && acc.userRole.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setDisplayedAccounts(filtered);
  }, [searchTerm]);

  const getRoleIcon = (role?: User['role']) => {
    if (role === 'admin') return <Shield className="h-4 w-4 text-red-500" />;
    if (role === 'business') return <Briefcase className="h-4 w-4 text-blue-500" />;
    if (role === 'user') return <UsersIcon className="h-4 w-4 text-green-500" />;
    return <UsersIcon className="h-4 w-4 text-muted-foreground" />;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/dashboard" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Admin Dashboard
      </Link>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><UsersIcon className="text-primary"/> All System Accounts</CardTitle>
          <CardDescription>
            View and search all accounts (User, Business, Admin) in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by name, email, ID, username, role..."
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
                    <TableHead>Card (Last 4)</TableHead>
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
            <p className="text-muted-foreground text-center py-4">No accounts match your search criteria.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

