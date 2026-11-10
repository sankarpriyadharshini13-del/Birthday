import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="relative min-h-dvh overflow-hidden bg-plum text-paper">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-hibiscus/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-marigold/30 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
        <p className="mb-4 font-display text-lg text-marigold">Birthday Wish</p>
        <h1 className="font-display text-5xl font-extrabold leading-[1.05] sm:text-6xl">
          One link. A new surprise every day until the big one.
        </h1>
        <p className="mt-6 max-w-md text-lg text-paper/80">
          Upload a photo, write a note, pick a song. Schedule a different photo and message for each day
          leading up to the birthday. They open the same link each morning. No login, no app.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={user ? '/dashboard' : '/login'} className="btn btn-primary">
            {user ? 'Go to my wishes' : 'Create a wish'}
          </Link>
        </div>
      </div>
    </main>
  );
}
