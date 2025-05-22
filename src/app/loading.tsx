
import { Loader2 } from "lucide-react";

export default function Loading() {
  // This UI will be shown by Next.js while route segments are loading.
  // It aims to be very prominent for diagnostic purposes.
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(255, 0, 0, 0.7)', // Bright red, semi-transparent
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999, // Ensure it's on top
        color: 'white',
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-16 w-16 animate-spin text-white" />
      <p className="mt-4 text-xl font-bold">LOADING PAGE DATA...</p>
      <p className="text-sm">(This is the global loading.tsx)</p>
    </div>
  );
}
