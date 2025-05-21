
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/layout/AppHeader";
import type { UserRole } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[]; // Optional: specify required role(s)
}

export function AppLayout({ children, requiredRole }: AppLayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/"); // Redirect to login if not authenticated
    } else if (!isLoading && isAuthenticated && user) {
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(user.role)) {
          // If role doesn't match, redirect to their default dashboard or login
          // This logic can be refined based on desired behavior
          switch (user.role) {
            case 'admin': router.replace("/admin/dashboard"); break;
            case 'business': router.replace("/business/dashboard"); break;
            case 'user': router.replace("/user/dashboard"); break;
            default: router.replace("/");
          }
        }
      }
    }
  }, [user, isLoading, isAuthenticated, router, requiredRole]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Additional check to ensure user is not null after loading and authentication.
  // And role check has passed or is not required for this specific layout instance.
  if (!user || (requiredRole && !(Array.isArray(requiredRole) ? requiredRole : [requiredRole]).includes(user.role))) {
     // This case should ideally be handled by the redirect effect, but as a fallback:
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Verifying access...</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="py-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Campus CashFlow. For educational purposes only.
        </div>
      </footer>
    </div>
  );
}
