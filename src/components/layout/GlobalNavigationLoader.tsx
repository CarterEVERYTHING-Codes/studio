
'use client';
import { useNavigation } from '@/contexts/NavigationContext';
import { Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function GlobalNavigationLoader() {
  const { isNavigating, setIsNavigating } = useNavigation();
  const pathname = usePathname();

  useEffect(() => {
    // Automatically hide loader when pathname changes (i.e., navigation likely completed)
    // or if it was stuck on for some reason.
    if (isNavigating) {
        setIsNavigating(false);
    }
  // Watching pathname to turn off loader when navigation is complete.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Removed setIsNavigating from deps to prevent potential loops if it changes too often

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(80, 120, 80, 0.3)', // Softer, on-theme semi-transparent green
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999, // Very high z-index
        color: 'hsl(var(--primary-foreground))', // Use theme color
      }}
      aria-live="assertive"
      aria-busy="true"
    >
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-xl font-bold">Loading Page...</p>
    </div>
  );
}
