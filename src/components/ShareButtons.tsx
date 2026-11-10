'use client';
import { useEffect, useState } from 'react';

export default function ShareButtons({ slug, baseUrl, name }: { slug: string; baseUrl: string; name: string }) {
  const [url, setUrl] = useState(baseUrl ? `${baseUrl}/wish/${slug}` : '');
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (!baseUrl) setUrl(`${window.location.origin}/wish/${slug}`);
    setCanShare(typeof navigator.share === 'function');
  }, [baseUrl, slug]);

  const text = `🎂 A birthday surprise for ${name}: ${url}`;

  async function copy() {
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt('Copy this link', url); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copy} className="btn btn-soft">{copied ? 'Copied!' : 'Copy link'}</button>
      <a className="btn bg-[#25D366] text-white hover:brightness-105" target="_blank" rel="noopener noreferrer"
         href={`https://wa.me/?text=${encodeURIComponent(text)}`}>WhatsApp</a>
      <a className="btn btn-soft" target="_blank" rel="noopener noreferrer"
         href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('🎂 A birthday surprise for ' + name)}`}>Telegram</a>
      {canShare && (
        <button type="button" className="btn btn-soft"
          onClick={() => navigator.share({ title: `Birthday surprise for ${name}`, url }).catch(() => {})}>More…</button>
      )}
    </div>
  );
}
