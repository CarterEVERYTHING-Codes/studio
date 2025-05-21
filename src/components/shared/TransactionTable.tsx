
import type { Transaction } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface TransactionTableProps {
  transactions: Transaction[];
  caption?: string;
  maxHeight?: string; // e.g., "400px"
}

export function TransactionTable({ transactions, caption, maxHeight = "auto" }: TransactionTableProps) {
  if (!transactions || transactions.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No transactions found.</p>;
  }

  return (
    <ScrollArea style={{ maxHeight: maxHeight }} className={maxHeight !== "auto" ? "rounded-md border" : ""}>
      <Table>
        {caption && <TableCaption>{caption}</TableCaption>}
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {/* Optional: Add From/To Account if needed for admin view */}
            {transactions.some(t => t.fromAccountId || t.toAccountId) && (
              <>
                <TableHead>From Account</TableHead>
                <TableHead>To Account</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {format(new Date(transaction.date), "MMM dd, yyyy hh:mm a")}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>
                <Badge variant={transaction.type === "deposit" ? "default" : transaction.type === "purchase" ? "destructive" : "secondary"} className="capitalize">
                  {transaction.type}
                </Badge>
              </TableCell>
              <TableCell className={`text-right font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
              </TableCell>
              { (transaction.fromAccountId || transaction.toAccountId) && (
                <>
                    <TableCell>{transaction.fromAccountId || 'N/A'}</TableCell>
                    <TableCell>{transaction.toAccountId || 'N/A'}</TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
