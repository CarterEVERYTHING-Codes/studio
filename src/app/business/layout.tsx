
import { AppLayout } from "@/components/layout/AppLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Dashboard - Campus CashFlow",
};

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout requiredRole="business">{children}</AppLayout>;
}
