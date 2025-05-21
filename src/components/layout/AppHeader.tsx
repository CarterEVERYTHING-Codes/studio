
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Home, LogOut, UserCircle, Briefcase, UserCog, PanelLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppHeaderProps {
  onToggleSidebar?: () => void; // For potential future sidebar integration
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { user, logout } = useAuth();

  const getRoleIcon = () => {
    if (!user) return <UserCircle />;
    switch (user.role) {
      case "admin":
        return <UserCog className="h-5 w-5 text-primary-foreground" />;
      case "business":
        return <Briefcase className="h-5 w-5 text-primary-foreground" />;
      case "user":
        return <UserCircle className="h-5 w-5 text-primary-foreground" />;
      default:
        return <UserCircle className="h-5 w-5 text-primary-foreground" />;
    }
  };
  
  const getDashboardPath = () => {
    if (!user) return "/";
    switch (user.role) {
      case "admin": return "/admin/dashboard";
      case "business": return "/business/dashboard";
      case "user": return "/user/dashboard";
      default: return "/";
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {onToggleSidebar && (
             <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="md:hidden">
               <PanelLeft className="h-5 w-5" />
               <span className="sr-only">Toggle Sidebar</span>
             </Button>
          )}
          <Link href={getDashboardPath()} className="flex items-center gap-2 text-lg font-semibold text-primary hover:text-primary/80 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-primary">
              <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM8.547 4.505a8.25 8.25 0 0 1 8.342 0 .75.75 0 0 1 .007.974l-.265.322-8.072.002-.272-.322a.75.75 0 0 1 .26-.976Zm1.129 12.75a.75.75 0 0 0 .078-.979l-.178-.22A8.214 8.214 0 0 1 7.5 12c0-1.92.666-3.68 1.776-5.046l.172-.215a.75.75 0 0 0-.083-.979A8.25 8.25 0 0 0 3.75 12a8.25 8.25 0 0 0 5.925 7.978Zm0-14.453A8.25 8.25 0 0 0 8.547 4.505l-.26.316a.75.75 0 0 0 .083.979l.172.215C9.594 7.32 10.25 9.082 10.25 10.5c0 1.92-.666 3.68-1.776 5.046l-.172.215a.75.75 0 0 0 .083.979l.26.316a8.25 8.25 0 0 0 1.13-1.723Z" />
              <path d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM5.25 12a.75.75 0 0 0 .75.75H9a.75.75 0 0 0 .75-.75V9a.75.75 0 0 0-.75-.75H6a.75.75 0 0 0-.75.75v3Zm9 0a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75V9a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v3Z" />
            </svg>
            <span>Campus CashFlow</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} alt={user.name} data-ai-hint="avatar person" />
                    <AvatarFallback className="bg-primary hover:bg-primary/90">
                      {getRoleIcon()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize pt-1">
                      Role: <span className="font-semibold text-foreground">{user.role}</span>
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(getDashboardPath())}>
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
