export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading your wishes">
      {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-ink/5" />)}
    </div>
  );
}
