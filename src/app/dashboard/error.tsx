'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="card text-center">
      <h2 className="font-display text-xl font-bold">Couldn't load this page</h2>
      <p className="mt-2 text-sm text-ink/70">{error.message}</p>
      <button onClick={reset} className="btn btn-primary mt-4">Try again</button>
    </div>
  );
}
