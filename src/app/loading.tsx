
import { Loader2 } from "lucide-react";

export default function Loading() {
  // This UI will be shown by Next.js while route segments are loading.
  // It will be rendered within the nearest parent layout (e.g., AppLayout).
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
