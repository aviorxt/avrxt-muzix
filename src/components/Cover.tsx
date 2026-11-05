'use client';
import { useEffect, useState } from 'react';
import { Disc3, ArrowUpRight } from 'lucide-react';
import { apiUrl } from '@/lib/api-gateway';
import { resolveArtwork, type Artwork } from '@/lib/artwork';
export default function Cover({ image, title, artist, album = '', albumOnly = false, eager = false, className = '' }: {
  image?: string; title: string; artist: string; album?: string; albumOnly?: boolean; eager?: boolean; className?: string;
}) {
  const key = JSON.stringify([title, artist, album, albumOnly, image]);
  const [result, setResult] = useState<{ key: string; artwork: Artwork } | null>(null);
  const [broken, setBroken] = useState('');
  const artwork = result?.key === key ? result.artwork : null;
  const url = artwork?.image || image || '';
  useEffect(() => {
    if ((image && broken !== image) || !artist || (!title && !album)) return;
    let active = true;
    const query = new URLSearchParams({ artist, track: title, album, ...(albumOnly ? { type: 'album' } : {}) });
    void resolveArtwork(apiUrl('/v1/music/artwork?' + query)).then(value => { if (active) setResult({ key, artwork: value }); });
    return () => { active = false; };
  }, [key, image, broken, title, artist, album, albumOnly]);
  return <div className={`cover ${className}`}>
    {url && broken !== url ?
      // Dynamic catalogue artwork is already sized by the source; no image proxy.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={`${title || album} cover`} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setBroken(url)} />
      : <span className="cover-placeholder" role="img" aria-label={`Artwork unavailable for ${title || album}`}><Disc3 aria-hidden="true" /></span>}
    {artwork?.source === 'apple' && artwork.sourceUrl && <a className="artwork-credit" href={artwork.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View ${title || album} on Apple Music`}>Apple Music <ArrowUpRight size={9} /></a>}
  </div>;
}
