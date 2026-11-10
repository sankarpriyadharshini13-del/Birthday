import { redirect } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  // Only allow priya@gmail.com as admin
  if (user.email !== 'priya@gmail.com') redirect('/dashboard');

  const { data: profile } = await supabase.from('profiles').select('role, is_blocked, full_name').eq('id', user.id).single();
  if (profile?.is_blocked) redirect('/dashboard');

  return (
    <>
      <AppHeader isAdmin name={profile?.full_name ?? user.email} />
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </>
  );
}
