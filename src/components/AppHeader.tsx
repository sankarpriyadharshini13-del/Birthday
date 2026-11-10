import Link from 'next/link';

export default function AppHeader({ isAdmin, name }: { isAdmin: boolean; name?: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl sm:max-w-3xl items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3">
        <Link href="/dashboard" className="font-display text-base sm:text-lg font-extrabold text-hibiscus">Birthday Wish</Link>
        <nav className="flex items-center gap-1 sm:gap-1 text-xs sm:text-sm font-semibold">
          {isAdmin && <Link href="/admin" className="rounded-full px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-ink/5">Admin</Link>}
          <form action="/auth/signout" method="post">
            <button className="rounded-full px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-ink/5" title={name ?? undefined}>Sign out</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
