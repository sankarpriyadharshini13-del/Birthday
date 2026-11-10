'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function safeNext() {
  const n = new URLSearchParams(window.location.search).get('next') || '/dashboard';
  return n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const next = safeNext();
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else { router.push(next); router.refresh(); }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) setError(error.message);
      else if (data.session) { router.push(next); router.refresh(); }
      else setInfo('Check your email and click the confirmation link to finish signing up.');
    }
    setBusy(false);
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}` },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm sm:max-w-md flex-col justify-center px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/" className="mb-6 sm:mb-8 font-display text-lg sm:text-xl font-bold text-hibiscus">Birthday Wish</Link>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>

      <button onClick={google} className="btn btn-soft mt-4 sm:mt-6 w-full border border-ink/10 bg-white">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
        Continue with Google
      </button>

      <div className="my-4 sm:my-5 flex items-center gap-3 text-xs text-ink/50"><span className="h-px flex-1 bg-ink/10" />or use email<span className="h-px flex-1 bg-ink/10" /></div>

      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {info && <p role="status" className="rounded-xl bg-teal/10 px-4 py-3 text-sm text-teal">{info}</p>}
        <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      </form>

      <button className="mt-4 sm:mt-6 text-sm text-ink/70 underline" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}>
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </main>
  );
}
