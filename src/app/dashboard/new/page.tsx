import WishForm from '@/components/WishForm';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Create wish' };

export default async function NewWish() {
  const supabase = await createClient();
  const { data: songs } = await supabase.from('songs').select('id, title, artist, url').eq('is_active', true).order('sort_order');
  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-extrabold">Create a wish</h1>
      <WishForm songs={songs ?? []} baseUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ''} />
    </>
  );
}
