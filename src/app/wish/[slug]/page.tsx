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

  // Use Vercel's URL or fallback to a default
  const siteUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const title = `🎂 A birthday surprise for ${wish.recipient_name}`;
  const description = 'Tap to open your birthday surprise!';

  // Ensure image URL is absolute
  let imageUrl = wish.default_image_url;
  if (!imageUrl.startsWith('http')) {
    imageUrl = `${siteUrl}${imageUrl}`;
  }

  // If using the default SVG, social media might not render it well
  // This is a fallback for better compatibility
  const ogImage = imageUrl.endsWith('.svg')
    ? `${siteUrl}/images/default-birthday.svg`
    : imageUrl;

  return {
    title, description,
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${siteUrl}/wish/${slug}`,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `Birthday surprise for ${wish.recipient_name}`,
      }],
      siteName: 'Birthday Wish',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function WishPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wish = await getWish(slug);
  if (!wish) notFound();
  return <WishView wish={wish} />;
}
