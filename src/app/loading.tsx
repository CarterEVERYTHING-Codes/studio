
import { Loader2 } from "lucide-react";

export default function Loading() {
  // This UI will be shown by Next.js while route segments are loading.
  // It will be rendered within the nearest parent layout (e.g., AppLayout),
  // replacing the {children} part of that layout during navigation.
  return (
    <div 
      className="flex flex-1 flex-col items-center justify-center py-12" // Changed from fixed to in-flow
      aria-live="polite" 
      aria-busy="true"
    >
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-md font-medium text-muted-foreground">Loading page...</p>
    </div>
  );
}
