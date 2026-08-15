export default function LoginLoading() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}
