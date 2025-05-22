
"use client";

import type { AuthenticatedUser, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import React, { createContext, useState, useEffect, ReactNode, useCallback } from "react";
import { mockUsers } from "@/lib/mock-data";

interface AuthContextType {
  user: AuthenticatedUser | null;
  login: (username: string, password_0: string) => Promise<boolean>; // Role removed
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadUserFromStorage = useCallback(() => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem("campusCashFlowUser");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as AuthenticatedUser;
        setUser(parsedUser);
      }
    } catch (e) {
      console.error("Failed to load user from storage", e);
      localStorage.removeItem("campusCashFlowUser");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  const login = async (username: string, password_0: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

    const possibleRoles: UserRole[] = ["admin", "business", "user"];
    let foundUser: AuthenticatedUser | undefined = undefined;

    for (const role of possibleRoles) {
      const potentialUser = mockUsers.find(
        (u) => u.username === username && u.password === password_0 && u.role === role
      );
      if (potentialUser) {
        foundUser = { ...potentialUser };
        break; 
      }
    }

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem("campusCashFlowUser", JSON.stringify(foundUser));
      setIsLoading(false);
      
      // Redirect based on role
      if (foundUser.role === "admin") router.push("/admin/dashboard");
      else if (foundUser.role === "business") router.push("/business/dashboard");
      else if (foundUser.role === "user") router.push("/user/dashboard");
      return true;
    } else {
      setError("Invalid username or password.");
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("campusCashFlowUser");
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error, isAuthenticated: !!user && !isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
