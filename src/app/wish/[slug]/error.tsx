'use client';
export default function WishError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-plum px-6 text-center text-paper">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Couldn't open the surprise</h1>
        <p className="mx-auto mt-2 max-w-xs text-paper/70">Check your connection and try again.</p>
        <button onClick={reset} className="btn btn-primary mt-6">Try again</button>
      </div>
    </main>
  );
}
