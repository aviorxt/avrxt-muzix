'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { resolveArtwork, type Artwork } from '@/lib/artwork';
import { apiUrl } from '@/lib/api-gateway';
export default function ArtistPortrait({ name, image, rank }: { name: string; image: string; rank: number }) {
  const [result, setResult] = useState<{ name: string; value: Artwork } | null>(null);
  const [failed, setFailed] = useState('');
  const artwork = result?.name === name ? result.value : null;
  const url = artwork?.image || image;
  useEffect(() => {
    if (image && failed !== image) return;
    let active = true;
    void resolveArtwork(apiUrl('/v1/music/artist-image?' + new URLSearchParams({ artist: name }))).then(value => { if (active) setResult({ name, value }); });
    return () => { active = false; };
  }, [name, image, failed]);
  return <div className="artist-portrait">
    {url && failed !== url ?
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={`${name} portrait`} loading="lazy" decoding="async" onError={() => setFailed(url)} />
      : <span className="portrait-initial" aria-label={`Portrait unavailable for ${name}`}>{name.charAt(0)}</span>}
    <span className="artist-rank">{String(rank).padStart(2, '0')}</span>
    {artwork?.sourceUrl && <a className="portrait-credit" href={artwork.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Artist photo from Deezer: ${name}`} title="Artist photo via Deezer"><ArrowUpRight size={9} /></a>}
  </div>;
}
