import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

const BOTS = /bot|crawler|spider|preview|whatsapp|facebookexternalhit|telegram|slack/i;

export async function POST(req: Request) {
  try {
    const { slug } = await req.json();
    if (typeof slug !== 'string' || slug.length === 0 || slug.length > 64) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const ua = req.headers.get('user-agent') ?? '';
    if (BOTS.test(ua)) return NextResponse.json({ ok: true, skipped: true });

    const { error } = await createPublicClient().rpc('record_view', { p_slug: slug, p_ua: ua });
    if (error) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
