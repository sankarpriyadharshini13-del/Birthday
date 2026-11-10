'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ShareButtons from './ShareButtons';

export type WishCardData = {
  id: string; slug: string; recipient_name: string; default_image_url: string;
  birthdayLabel: string; countdownLabel: string; is_disabled: boolean; view_count: number; daysScheduled: number;
};

export default function WishCard({ wish, baseUrl }: { wish: WishCardData; baseUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(`Delete the wish for ${wish.recipient_name}? The link will stop working.`)) return;
    setBusy(true);
    const { error } = await createClient().from('wishes').delete().eq('id', wish.id);
    if (error) { setError(error.message); setBusy(false); } else router.refresh();
  }

  return (
    <article className="card">
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wish.default_image_url} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl font-bold">{wish.recipient_name}</h2>
          <p className="text-sm text-ink/70">{wish.birthdayLabel} · {wish.countdownLabel}</p>
          <p className="mt-1 text-xs text-ink/60">
            {wish.view_count} view{wish.view_count === 1 ? '' : 's'} · {wish.daysScheduled} day{wish.daysScheduled === 1 ? '' : 's'} scheduled
          </p>
          {wish.is_disabled && <p className="mt-2 inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Disabled by an admin</p>}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <ShareButtons slug={wish.slug} baseUrl={baseUrl} name={wish.recipient_name} />
        <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-3">
          <Link href={`/wish/${wish.slug}`} target="_blank" className="btn btn-soft">Preview</Link>
          <Link href={`/dashboard/${wish.id}/edit`} className="btn btn-soft">Edit</Link>
          <button onClick={remove} disabled={busy} className="btn btn-danger">{busy ? 'Deleting…' : 'Delete'}</button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </article>
  );
}
