
import { Loader2 } from "lucide-react";

export default function Loading() {
  // This UI will be shown by Next.js while route segments are loading.
  // It will be rendered within the nearest parent layout (e.g., AppLayout),
  // replacing the {children} part of that layout during navigation.
  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
      aria-live="polite" 
      aria-busy="true"
    >
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-lg font-medium text-foreground">Loading page, please wait...</p>
    </div>
  );
}
