import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Birthday Wish',
  description: 'Make a birthday page that counts down, changes every day, and plays their favourite song.',
};
export const viewport: Viewport = { themeColor: '#1E0B2E', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
