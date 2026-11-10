import { redirect } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role, is_blocked, full_name').eq('id', user.id).single();

  return (
    <>
      <AppHeader isAdmin={profile?.role === 'admin'} name={profile?.full_name ?? user.email} />
      {profile?.is_blocked && (
        <p className="bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white">
          Your account is blocked. You can't create or edit wishes.
        </p>
      )}
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </>
  );
}
