'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicWish } from '@/lib/types';
import { birthdayInfo, formatIso } from '@/lib/time';
import Bunting from './Bunting';
import Celebration from './Celebration';
import Countdown from './Countdown';

export default function WishView({ wish }: { wish: PublicWish }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const refreshedFor = useRef<string | null>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  // Tick every second (client only, so no hydration mismatch)
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const info = now === null ? null : birthdayInfo(wish.birth_month, wish.birth_day, wish.timezone, new Date(now));
  const isBirthday = info?.isBirthday ?? false;

  // When midnight passes in the recipient's timezone, re-fetch today's content.
  // The ref guard prevents a refresh loop if the device clock is wrong.
  useEffect(() => {
    if (info && info.todayIso !== wish.today && refreshedFor.current !== info.todayIso) {
      refreshedFor.current = info.todayIso;
      router.refresh();
    }
  }, [info?.todayIso, wish.today, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count one view per browser session
  useEffect(() => {
    const key = `viewed:${wish.slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch('/api/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: wish.slug }), keepalive: true }).catch(() => {});
  }, [wish.slug]);

  function start() {
    setStarted(true);
    audioRef.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else { a.pause(); setPlaying(false); }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      <Bunting />
      {isBirthday && <Celebration active={started} />}

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 md:px-8 pb-24 md:pb-28 pt-16 md:pt-20 text-center">
        {isBirthday ? (
          <div className="space-y-4 md:space-y-6">
            <div className="animate-bounce">
              <span className="text-5xl sm:text-6xl md:text-7xl">🎂</span>
            </div>
            <h1 className="animate-pop font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              Happy Birthday<br />
              <span className="text-white">{wish.recipient_name}</span>!
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/80 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              ✨ May this special day bring you joy, love, and happiness ✨
            </p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <div className="animate-bounce">
              <span className="text-4xl sm:text-5xl md:text-6xl">🎁</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
              {wish.recipient_name}'s birthday is coming
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-white/70">
              {info ? `${formatIso(info.nextIso, { month: 'long', day: 'numeric' })}, and counting` : '\u00A0'}
            </p>
            <Countdown ms={info ? info.target - (now as number) : null} />
          </div>
        )}

        <figure className="relative mx-auto mt-8 md:mt-16 w-full max-w-sm sm:max-w-md md:max-w-lg animate-float">
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border-2 md:border-4 border-white/20 backdrop-blur-sm bg-white/10">
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-8 h-8 md:w-16 md:h-16 border-t-2 md:border-t-4 border-l-2 md:border-l-4 border-pink-400/50 rounded-tl-xl md:rounded-tl-3xl" />
            <div className="absolute top-0 right-0 w-8 h-8 md:w-16 md:h-16 border-t-2 md:border-t-4 border-r-2 md:border-r-4 border-purple-400/50 rounded-tr-xl md:rounded-tr-3xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 md:w-16 md:h-16 border-b-2 md:border-b-4 border-l-2 md:border-l-4 border-indigo-400/50 rounded-bl-xl md:rounded-bl-3xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 md:w-16 md:h-16 border-b-2 md:border-b-4 border-r-2 md:border-r-4 border-pink-400/50 rounded-br-xl md:rounded-br-3xl" />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={wish.image_url}
              src={wish.image_url}
              alt={`A photo for ${wish.recipient_name}`}
              className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 md:p-4">
              <p className="font-display text-sm md:text-lg font-semibold text-white">{formatIso(wish.today)}</p>
            </div>
          </div>
        </figure>

        <section className="mt-8 md:mt-12 rounded-2xl md:rounded-3xl bg-white/10 backdrop-blur-md p-4 md:p-6 lg:p-8 text-left border border-white/20 shadow-2xl">
          <div className="flex items-start gap-3 md:gap-4">
            <span className="text-2xl sm:text-3xl md:text-4xl animate-pulse">💝</span>
            <p className="whitespace-pre-wrap text-sm sm:text-base md:text-lg leading-relaxed text-white/90">{wish.message}</p>
          </div>
        </section>
      </div>

      {wish.audio_url && <audio ref={audioRef} src={wish.audio_url} loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />}

      {started && wish.audio_url && (
        <button
          onClick={toggle}
          aria-label={playing ? 'Pause music' : 'Play music'}
          title={wish.song_title ?? undefined}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-30 grid h-12 w-12 md:h-16 md:w-16 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/30"
        >
          {playing
            ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
        </button>
      )}

      {!started && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/95 px-4 sm:px-6 text-center backdrop-blur-md">
          <div className="space-y-6 md:space-y-8 max-w-md w-full">
            <div className="space-y-3 md:space-y-4">
              <div aria-hidden className="mx-auto flex justify-center gap-2 md:gap-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-12 w-3 md:h-16 md:w-4 rounded-full animate-bounce"
                    style={{
                      background: ['#FF4F81', '#FFC233', '#6CCBFF', '#19B8A6', '#9B5DE5'][i],
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '1.5s'
                    }}
                  />
                ))}
              </div>
              <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent px-2">
                A special surprise for {wish.recipient_name}
              </p>
              <p className="text-white/60 text-sm sm:text-base md:text-lg">Something magical awaits...</p>
            </div>
            <button
              onClick={start}
              className="group relative inline-flex items-center justify-center gap-2 md:gap-3 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold text-sm md:text-lg rounded-full shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-white/30 w-full sm:w-auto"
            >
              <span className="text-xl md:text-2xl">{wish.audio_url ? '🎵' : '✨'}</span>
              <span>{wish.audio_url ? 'Tap to start with music' : 'Tap to open'}</span>
              <span className="text-xl md:text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
