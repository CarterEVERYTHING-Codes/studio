
import { AppLayout } from "@/components/layout/AppLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Dashboard - Campus CashFlow",
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout requiredRole="user">{children}</AppLayout>;
}
