
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { NavigationProvider } from "@/contexts/NavigationContext"; // Added import
import { GlobalNavigationLoader } from "@/components/layout/GlobalNavigationLoader"; // Added import

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Campus CashFlow",
  description: "Banking app for school programs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <AuthProvider>
          <NavigationProvider> {/* Added provider */}
            {children}
            <GlobalNavigationLoader /> {/* Added loader component */}
            <Toaster />
          </NavigationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
