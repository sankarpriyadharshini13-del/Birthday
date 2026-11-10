'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Song, Wish, WishDay } from '@/lib/types';
import {
  MONTHS, addDaysIso, birthdayInfo, browserTimezone, daysInMonth, formatIso, timezoneList,
} from '@/lib/time';
import { compressImage, uploadFile, validateFile } from '@/lib/upload';
import ShareButtons from './ShareButtons';

type DayRow = { key: string; date: string; message: string; imageUrl: string | null; file: File | null; preview: string | null };
type Props = { songs: Song[]; baseUrl: string; initial?: { wish: Wish; days: WishDay[] } };

const newKey = () => crypto.randomUUID();

export default function WishForm({ songs, baseUrl, initial }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const w = initial?.wish;
  const timezones = useMemo(() => timezoneList(), []);

  const [name, setName] = useState(w?.recipient_name ?? '');
  const [month, setMonth] = useState(w?.birth_month ?? 1);
  const [day, setDay] = useState(w?.birth_day ?? 1);
  const [tz, setTz] = useState(w?.timezone ?? 'Asia/Calcutta');
  const [message, setMessage] = useState(w?.default_message ?? '');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(w?.default_image_url ?? null);

  const [songMode, setSongMode] = useState<'builtin' | 'upload' | 'none'>(
    w?.custom_audio_url ? 'upload' : w?.song_id || !initial ? 'builtin' : 'none',
  );
  const [songId, setSongId] = useState<string>(w?.song_id ?? songs[0]?.id ?? '');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [days, setDays] = useState<DayRow[]>(
    (initial?.days ?? []).map((d) => ({
      key: d.id, date: d.date, message: d.message ?? '', imageUrl: d.image_url, file: null, preview: d.image_url,
    })),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string } | null>(null);

  const selectedSong = songs.find((s) => s.id === songId);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    const err = validateFile(file, 'image');
    if (err) return setError(err);
    setError(null); setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file));
  }

  function pickDayPhoto(key: string, file: File | undefined) {
    if (!file) return;
    const err = validateFile(file, 'image');
    if (err) return setError(err);
    setError(null);
    setDays((rows) => rows.map((r) => (r.key === key ? { ...r, file, preview: URL.createObjectURL(file) } : r)));
  }

  const patchDay = (key: string, patch: Partial<DayRow>) =>
    setDays((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addDay() {
    const info = birthdayInfo(month, day, tz);
    const last = [...days].map((d) => d.date).filter(Boolean).sort().pop();
    const date = last ? addDaysIso(last, 1) : info.todayIso;
    setDays((r) => [...r, { key: newKey(), date, message: '', imageUrl: null, file: null, preview: null }]);
  }

  /** One empty row for each day from today up to (and including) the birthday. */
  function fillUntilBirthday() {
    const info = birthdayInfo(month, day, tz);
    const have = new Set(days.map((d) => d.date));
    const rows: DayRow[] = [];
    for (let cur = info.todayIso; cur <= info.nextIso && rows.length < 31; cur = addDaysIso(cur, 1)) {
      if (!have.has(cur)) rows.push({ key: newKey(), date: cur, message: '', imageUrl: null, file: null, preview: null });
    }
    setDays((r) => [...r, ...rows].sort((a, b) => a.date.localeCompare(b.date)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Enter the recipient's name.");
    // Photo is now optional - will use a default if not provided
    if (!message.trim()) return setError('Write the default message.');
    if (songMode === 'builtin' && songs.length && !songId) return setError('Choose a song.');
    if (songMode === 'upload' && !audioFile && !w?.custom_audio_url) return setError('Choose an audio file to upload.');
    if (days.some((d) => !d.date)) return setError('Every scheduled day needs a date.');
    if (new Set(days.map((d) => d.date)).size !== days.length) return setError('Two scheduled days share the same date.');
    if (days.some((d) => !d.message.trim() && !d.preview)) return setError('Each scheduled day needs a photo, a message, or both.');
    if (audioFile) {
      const err = validateFile(audioFile, 'audio');
      if (err) return setError(err);
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Your session expired. Sign in again.');

      // Ensure profile exists
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
      if (!profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
          role: user.email === 'priya@gmail.com' ? 'admin' : 'user'
        });
      }

      const defaultImage = photoFile
        ? await uploadFile(supabase, 'wish-images', user.id, await compressImage(photoFile))
        : w?.default_image_url || '/images/default-birthday.svg';

      let customAudio: string | null = null;
      if (songMode === 'upload') {
        customAudio = audioFile ? await uploadFile(supabase, 'wish-audio', user.id, audioFile) : w?.custom_audio_url ?? null;
      }

      const payload = {
        recipient_name: name.trim(),
        birth_month: month,
        birth_day: day,
        timezone: tz,
        default_image_url: defaultImage,
        default_message: message.trim(),
        song_id: songMode === 'builtin' ? songId || null : null,
        custom_audio_url: songMode === 'upload' ? customAudio : null,
      };

      let wishId = w?.id;
      let slug = w?.slug;
      if (wishId) {
        const { error } = await supabase.from('wishes').update(payload).eq('id', wishId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('wishes').insert({ ...payload, user_id: user.id }).select('id, slug').single();
        if (error) throw error;
        wishId = data.id; slug = data.slug;
      }

      const rows = [];
      for (const d of days) {
        const image = d.file ? await uploadFile(supabase, 'wish-images', user.id, await compressImage(d.file)) : d.imageUrl;
        rows.push({ wish_id: wishId, date: d.date, image_url: image, message: d.message.trim() || null });
      }
      if (rows.length) {
        const { error } = await supabase.from('wish_days').upsert(rows, { onConflict: 'wish_id,date' });
        if (error) throw error;
      }
      // Remove days the creator deleted
      const del = supabase.from('wish_days').delete().eq('wish_id', wishId!);
      const { error: delErr } = rows.length ? await del.not('date', 'in', `(${rows.map((r) => r.date).join(',')})`) : await del;
      if (delErr) throw delErr;

      if (initial) { router.push('/dashboard'); router.refresh(); }
      else setCreated({ slug: slug! });
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as { message?: string }).message ?? 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="card space-y-4 sm:space-y-6 text-center py-6 sm:py-8 px-4">
        <div className="space-y-2">
          <p className="text-4xl sm:text-5xl md:text-6xl" aria-hidden>🎉</p>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Your Birthday Link is Ready!
          </h2>
          <p className="text-xs sm:text-sm text-ink/70">
            Send this magical link to <span className="font-semibold text-ink">{name}</span>.<br />
            They'll see a new surprise every day leading up to their birthday!
          </p>
        </div>
        <div className="flex justify-center">
          <ShareButtons slug={created.slug} baseUrl={baseUrl} name={name} />
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 p-4 sm:p-6 border border-pink-200">
          <p className="text-xs text-ink/60 mb-2">Your unique link:</p>
          <code className="block bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm break-all">{baseUrl}/wish/{created.slug}</code>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 border-t border-ink/10 pt-4 sm:pt-6">
          <Link href={`/wish/${created.slug}`} target="_blank" className="btn btn-soft flex items-center gap-2 text-xs sm:text-sm">
            <span>👁️</span> Preview Page
          </Link>
          <Link href="/dashboard" className="btn btn-primary flex items-center gap-2 text-xs sm:text-sm">
            <span>📋</span> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="card space-y-4">
        <h2 className="font-display text-lg sm:text-xl font-bold">Who is it for?</h2>
        <div>
          <label className="label" htmlFor="name">Recipient name</label>
          <input id="name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Aisha" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="month">Birthday month</label>
            <select id="month" className="input" value={month} onChange={(e) => { const m = +e.target.value; setMonth(m); if (day > daysInMonth(m)) setDay(daysInMonth(m)); }}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="day">Day</label>
            <select id="day" className="input" value={day} onChange={(e) => setDay(+e.target.value)}>
              {Array.from({ length: daysInMonth(month) }, (_, i) => <option key={i + 1}>{i + 1}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="tz">Recipient's timezone</label>
          <select id="tz" className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
            {timezones.map((z) => <option key={z}>{z}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-ink/60">The countdown ends, and each day's content switches, at midnight in this timezone. The birthday repeats every year.</p>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-display text-lg sm:text-xl font-bold">Default photo and message</h2>
        <p className="-mt-2 text-sm text-ink/70">Shown on every day that has nothing scheduled. Photo is optional.</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {photoPreview
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={photoPreview} alt="Selected photo preview" className="h-24 w-20 sm:h-28 sm:w-24 rounded-2xl object-cover shadow-md" />
            : <div className="grid h-24 w-20 sm:h-28 sm:w-24 place-items-center rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 text-xs text-ink/50 border-2 border-dashed border-pink-300">
                <span className="text-center">Optional</span>
              </div>}
          <label className="btn btn-soft cursor-pointer w-full sm:w-auto">
            {photoPreview ? 'Change photo' : 'Choose photo (optional)'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </label>
        </div>
        <div>
          <label className="label" htmlFor="msg">Personal message</label>
          <textarea id="msg" rows={5} maxLength={2000} className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Happy birthday! Here's to another year of…" />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-display text-lg sm:text-xl font-bold">Background song</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Song source">
          {([['builtin', 'Pick one'], ['upload', 'Upload'], ['none', 'No music']] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={songMode === v} onClick={() => setSongMode(v)}
              className={`btn text-xs sm:text-sm ${songMode === v ? 'bg-ink text-white' : 'btn-soft'}`}>{label}</button>
          ))}
        </div>
        {songMode === 'builtin' && (
          songs.length === 0 ? <p className="text-sm text-ink/60">No built-in songs yet. Upload your own instead.</p> : (
            <div className="space-y-3">
              <select className="input" aria-label="Built-in song" value={songId} onChange={(e) => setSongId(e.target.value)}>
                {songs.map((s) => <option key={s.id} value={s.id}>{s.title}{s.artist ? ` · ${s.artist}` : ''}</option>)}
              </select>
              {selectedSong && <audio key={selectedSong.id} controls preload="none" src={selectedSong.url} className="w-full" />}
            </div>
          )
        )}
        {songMode === 'upload' && (
          <div className="space-y-2">
            <label className="btn btn-soft cursor-pointer">
              {audioFile ? 'Change file' : w?.custom_audio_url ? 'Replace current song' : 'Choose audio file'}
              <input type="file" accept="audio/*" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const err = validateFile(f, 'audio'); if (err) setError(err); else { setError(null); setAudioFile(f); } }} />
            </label>
            {audioFile && <p className="text-sm text-ink/70">{audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
            {!audioFile && w?.custom_audio_url && <audio controls preload="none" src={w.custom_audio_url} className="w-full" />}
            <p className="text-xs text-ink/60">MP3, M4A, AAC, WAV or OGG, up to 10 MB. Only upload music you have the right to share.</p>
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold">Daily surprises</h2>
          <p className="mt-1 text-sm text-ink/70">Add a different photo and message for each day. The link shows whichever matches today's date, and falls back to the default.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={fillUntilBirthday} className="btn btn-soft">Add every day until the birthday</button>
          <button type="button" onClick={addDay} className="btn btn-soft">Add one day</button>
        </div>

        {days.length === 0 && <p className="rounded-2xl bg-ink/5 px-4 py-6 text-center text-sm text-ink/60">No scheduled days. The default photo and message show every day.</p>}

        <ul className="space-y-4">
          {days.map((d) => (
            <li key={d.key} className="rounded-2xl border border-ink/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="sr-only" htmlFor={`d-${d.key}`}>Date</label>
                  <input id={`d-${d.key}`} type="date" className="input !w-auto !py-2" value={d.date} onChange={(e) => patchDay(d.key, { date: e.target.value })} />
                </div>
                <button type="button" className="btn btn-danger" onClick={() => setDays((r) => r.filter((x) => x.key !== d.key))}>Remove</button>
              </div>
              {d.date && <p className="mt-2 text-xs text-ink/60">{formatIso(d.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>}
              <div className="mt-3 flex gap-3">
                <label className="group relative h-24 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-ink/5">
                  {d.preview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={d.preview} alt="" className="h-full w-full object-cover" />
                    : <span className="grid h-full place-items-center px-1 text-center text-xs text-ink/50">Add photo</span>}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickDayPhoto(d.key, e.target.files?.[0])} />
                </label>
                <textarea aria-label="Message for this day" rows={3} maxLength={2000} className="input" placeholder="Message for this day" value={d.message} onChange={(e) => patchDay(d.key, { message: e.target.value })} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="sticky bottom-0 -mx-4 border-t border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur">
        <button disabled={saving} className="btn btn-primary w-full">{saving ? 'Saving…' : initial ? 'Save changes' : 'Create wish and get link'}</button>
      </div>
    </form>
  );
}
