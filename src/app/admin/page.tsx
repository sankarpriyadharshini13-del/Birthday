import { createAdminClient } from '@/lib/supabase/admin';
import BarChart from '@/components/admin/BarChart';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { setUserBlocked, setWishDisabled, deleteWish } from './actions';
import { MONTHS } from '@/lib/time';

export const metadata = { title: 'Admin' };
export const dynamic = 'force-dynamic';

const DAYS = 30;
function lastDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}
const series = (rows: { created_at: string }[], days: string[]) =>
  days.map((d) => ({ label: d.slice(5), value: rows.filter((r) => r.created_at.slice(0, 10) === d).length }));

export default async function AdminPage() {
  // NOTE: loads everything. Add pagination if you expect tens of thousands of rows.
  const db = createAdminClient();
  const [{ data: profiles }, { data: wishes }] = await Promise.all([
    db.from('profiles').select('id, email, full_name, role, is_blocked, created_at').order('created_at', { ascending: false }),
    db.from('wishes').select('id, user_id, slug, recipient_name, birth_month, birth_day, is_disabled, view_count, created_at').order('created_at', { ascending: false }),
  ]);
  const users = profiles ?? [];
  const links = wishes ?? [];
  const blocked = new Set(users.filter((u) => u.is_blocked).map((u) => u.id));
  const active = links.filter((l) => !l.is_disabled && !blocked.has(l.user_id));
  const totalViews = links.reduce((a, l) => a + l.view_count, 0);
  const days = lastDays(DAYS);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  const stats = [
    ['Registered users', users.length], ['Links created', links.length],
    ['Active links', active.length], ['Total views', totalViews],
  ] as const;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold">Admin</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card !p-4">
            <div className="font-display text-3xl font-extrabold tabular-nums">{value}</div>
            <div className="text-sm text-ink/70">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BarChart title="Signups" data={series(users, days)} color="#FF4F81" />
        <BarChart title="Links created" data={series(links, days)} color="#19B8A6" />
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Users and their links</h2>
        <div className="space-y-3">
          {users.map((u) => {
            const mine = links.filter((l) => l.user_id === u.id);
            return (
              <details key={u.id} className="card !p-0 open:shadow-md">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{u.email ?? u.full_name ?? u.id}</span>
                    <span className="text-xs text-ink/60">
                      Joined {u.created_at.slice(0, 10)} · {mine.length} link{mine.length === 1 ? '' : 's'}
                      {u.role === 'admin' && ' · admin'}
                    </span>
                  </span>
                  {u.is_blocked && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Blocked</span>}
                </summary>
                <div className="border-t border-ink/10 px-5 py-4">
                  <form action={setUserBlocked.bind(null, u.id, !u.is_blocked)} className="mb-4">
                    <ConfirmButton message={u.is_blocked ? 'Unblock this user?' : 'Block this user? Their links stop working and they cannot create new ones.'}
                      className={`btn ${u.is_blocked ? 'btn-soft' : 'btn-danger'}`}>
                      {u.is_blocked ? 'Unblock user' : 'Block user'}
                    </ConfirmButton>
                  </form>
                  {mine.length === 0 ? <p className="text-sm text-ink/60">No links yet.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="text-xs text-ink/60"><tr>
                          <th className="py-2 pr-3 font-semibold">Recipient</th><th className="pr-3 font-semibold">Birthday</th>
                          <th className="pr-3 font-semibold">Created</th><th className="pr-3 font-semibold">Link</th>
                          <th className="pr-3 font-semibold">Views</th><th className="font-semibold">Actions</th></tr></thead>
                        <tbody>
                          {mine.map((l) => (
                            <tr key={l.id} className="border-t border-ink/10 align-middle">
                              <td className="py-2 pr-3 font-medium">{l.recipient_name}{l.is_disabled && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">disabled</span>}</td>
                              <td className="pr-3">{MONTHS[l.birth_month - 1].slice(0, 3)} {l.birth_day}</td>
                              <td className="pr-3">{l.created_at.slice(0, 10)}</td>
                              <td className="pr-3"><a className="text-hibiscus underline" target="_blank" rel="noopener noreferrer" href={`${base}/wish/${l.slug}`}>/wish/{l.slug}</a></td>
                              <td className="pr-3 tabular-nums">{l.view_count}</td>
                              <td><div className="flex gap-2 py-1">
                                <form action={setWishDisabled.bind(null, l.id, !l.is_disabled)}><button className="btn btn-soft !min-h-9 !px-3">{l.is_disabled ? 'Enable' : 'Disable'}</button></form>
                                <form action={deleteWish.bind(null, l.id)}><ConfirmButton message={`Permanently delete the link for ${l.recipient_name}?`} className="btn btn-danger !min-h-9 !px-3">Delete</ConfirmButton></form>
                              </div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
