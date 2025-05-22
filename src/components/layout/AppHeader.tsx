
"use client";

import { LoadingLink } from "@/components/shared/LoadingLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Home, LogOut, UserCircle, Briefcase, UserCog, PanelLeft, Sun, Moon, Laptop, HelpCircle, Bug } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub, 
  DropdownMenuSubContent, 
  DropdownMenuSubTrigger, 
  DropdownMenuPortal, 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/contexts/NavigationContext";
import { useTheme } from "next-themes"; 
import { useEffect, useState } from "react";
import { TutorialModal } from "./TutorialModal";
import Image from "next/image"; // Import next/image

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { setIsNavigating } = useNavigation();
  const { setTheme, resolvedTheme } = useTheme(); 
  const [mounted, setMounted] = useState(false); 
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => {
    setMounted(true); 
  }, []);

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

  const handleDashboardNavigation = () => {
    const path = getDashboardPath();
    setIsNavigating(true); 
    router.push(path);
  };

  const handleLogout = () => {
    setIsNavigating(true);
    logout();
  };

  const handleTutorialClick = () => {
    setIsTutorialOpen(true);
  };

  const canShowTutorial = user && (user.role === 'user' || user.role === 'business');

  if (!mounted) { 
    return ( 
        <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
         <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
            <LoadingLink href={getDashboardPath()} className="flex items-center gap-2 text-lg font-semibold text-primary hover:text-primary/80 transition-colors">
                {/* Placeholder for logo until mounted to avoid hydration issues with Image */}
                <div className="w-8 h-8"></div> 
                <span>Campus CashFlow</span>
            </LoadingLink>
            </div>
            <div className="flex items-center gap-2">
                {/* Placeholder for buttons and user avatar until mounted */}
            </div>
        </div>
        </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {onToggleSidebar && (
              <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="md:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            )}
            <LoadingLink href={getDashboardPath()} className="flex items-center gap-2 text-lg font-semibold text-primary hover:text-primary/80 transition-colors">
              <Image src="/logo.png" alt="Campus CashFlow Logo" width={32} height={32} data-ai-hint="piggy bank"/>
              <span>Campus CashFlow</span>
            </LoadingLink>
          </div>

          <div className="flex items-center gap-2">
            {canShowTutorial && (
              <Button variant="ghost" size="sm" onClick={handleTutorialClick}>
                <HelpCircle className="mr-1 h-4 w-4" />
                Tutorial
              </Button>
            )}
            {user && (
              <Button variant="ghost" size="sm" asChild>
                <a href="https://forms.office.com/Pages/ResponsePage.aspx?id=BLz2Ec8cMUi0vqcgjsi4-GqIj1C-TohGgk1iAQp1X5BUNk1OREpZTVFFNFA4NklYWDVZSDI3VVo2Uy4u" target="_blank" rel="noopener noreferrer">
                  <Bug className="mr-1 h-4 w-4" />
                  Report Bug
                </a>
              </Button>
            )}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={`https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} alt={user.name} data-ai-hint="avatar person"/>
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
                  <DropdownMenuItem onClick={handleDashboardNavigation}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      {resolvedTheme === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                      <span>Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme('light')}>
                          <Sun className="mr-2 h-4 w-4" />
                          Light
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('dark')}>
                          <Moon className="mr-2 h-4 w-4" />
                          Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('system')}>
                          <Laptop className="mr-2 h-4 w-4" />
                          System
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
      {user && <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} userRole={user.role} />}
    </>
  );
}
