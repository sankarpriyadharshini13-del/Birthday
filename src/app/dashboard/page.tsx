import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import WishCard, { type WishCardData } from '@/components/WishCard';
import { MONTHS, birthdayInfo, daysBetween } from '@/lib/time';

export const metadata = { title: 'My wishes' };

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: wishes, error }, { data: days }] = await Promise.all([
    supabase.from('wishes')
      .select('id, slug, recipient_name, birth_month, birth_day, timezone, default_image_url, is_disabled, view_count')
      .order('created_at', { ascending: false }),
    supabase.from('wish_days').select('wish_id, date'),
  ]);
  if (error) throw new Error(error.message);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const cards: WishCardData[] = (wishes ?? []).map((w) => {
    const info = birthdayInfo(w.birth_month, w.birth_day, w.timezone);
    const left = daysBetween(info.todayIso, info.nextIso);
    return {
      id: w.id, slug: w.slug, recipient_name: w.recipient_name, default_image_url: w.default_image_url,
      is_disabled: w.is_disabled, view_count: w.view_count,
      birthdayLabel: `${MONTHS[w.birth_month - 1]} ${w.birth_day}`,
      countdownLabel: info.isBirthday ? 'Today! 🎉' : left === 1 ? 'tomorrow' : `in ${left} days`,
      daysScheduled: (days ?? []).filter((d) => d.wish_id === w.id).length,
    };
  });

  return (
    <>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Your wishes</h1>
        <Link href="/dashboard/new" className="btn btn-primary w-full sm:w-auto">Create wish</Link>
      </div>
      {cards.length === 0 ? (
        <div className="card py-8 sm:py-12 text-center px-4">
          <p className="font-display text-lg sm:text-xl font-bold">No wishes yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-ink/70">Create one to get a link you can send to the birthday person.</p>
          <Link href="/dashboard/new" className="btn btn-primary mt-4 sm:mt-5 w-full sm:w-auto">Create your first wish</Link>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">{cards.map((c) => <WishCard key={c.id} wish={c} baseUrl={baseUrl} />)}</div>
      )}
    </>
  );
}
