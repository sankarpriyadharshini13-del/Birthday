import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createPublicClient } from '@/lib/supabase/public';
import type { PublicWish } from '@/lib/types';
import WishView from '@/components/wish/WishView';

// Today's content depends on the clock, so never cache this page.
export const dynamic = 'force-dynamic';

// Deduplicated between generateMetadata and the page within one request.
const getWish = cache(async (slug: string) => {
  const { data, error } = await createPublicClient().rpc('get_public_wish', { p_slug: slug });
  if (error) throw new Error(error.message);
  return data as PublicWish | null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const wish = await getWish(slug).catch(() => null);
  if (!wish) return { title: 'Birthday wish', robots: { index: false, follow: false } };

  const title = `🎂 A birthday surprise for ${wish.recipient_name}`;
  const description = 'Tap to open your birthday surprise.';
  return {
    title, description,
    robots: { index: false, follow: false },
    openGraph: { type: 'website', title, description, images: [{ url: wish.default_image_url }] },
    twitter: { card: 'summary_large_image', title, description, images: [wish.default_image_url] },
  };
}

export default async function WishPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wish = await getWish(slug);
  if (!wish) notFound();
  return <WishView wish={wish} />;
}
