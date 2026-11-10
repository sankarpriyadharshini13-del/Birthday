import { notFound } from 'next/navigation';
import WishForm from '@/components/WishForm';
import { createClient } from '@/lib/supabase/server';
import type { Wish, WishDay } from '@/lib/types';

export const metadata = { title: 'Edit wish' };

export default async function EditWish({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: wish }, { data: days }, { data: songs }] = await Promise.all([
    supabase.from('wishes').select('*').eq('id', id).maybeSingle(),   // RLS: owner only
    supabase.from('wish_days').select('*').eq('wish_id', id).order('date'),
    supabase.from('songs').select('id, title, artist, url').eq('is_active', true).order('sort_order'),
  ]);
  if (!wish) notFound();
  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-extrabold">Edit wish for {wish.recipient_name}</h1>
      <WishForm songs={songs ?? []} baseUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ''}
                initial={{ wish: wish as Wish, days: (days ?? []) as WishDay[] }} />
    </>
  );
}
