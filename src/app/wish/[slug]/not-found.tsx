export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-plum px-6 text-center text-paper">
      <div>
        <p className="text-5xl" aria-hidden>🎈</p>
        <h1 className="mt-4 font-display text-3xl font-extrabold">This link isn't active</h1>
        <p className="mx-auto mt-2 max-w-xs text-paper/70">It may have been mistyped or removed. Ask the person who sent it to share it again.</p>
      </div>
    </main>
  );
}
