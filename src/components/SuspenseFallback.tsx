import { Skeleton } from "@/components/ui/skeleton";
export function SuspenseFallback() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 md:py-16 space-y-8">
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-5/6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}