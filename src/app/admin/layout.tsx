
import { AppLayout } from "@/components/layout/AppLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard - Campus CashFlow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout requiredRole="admin">{children}</AppLayout>;
}
