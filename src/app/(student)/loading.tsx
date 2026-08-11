import { Skeleton } from "@/components/ui/skeleton";

export default function StudentLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <Skeleton className="mt-6 h-16 w-full" />
            <Skeleton className="mt-4 h-4 w-1/3" />
          </div>
        ))}
      </div>
    </main>
  );
}
