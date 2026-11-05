import { matchCatalog, type CatalogItem } from './catalog-match';
export type Artwork = { image: string; source: 'lastfm' | 'apple' | 'deezer' | null; sourceUrl: string; clientLookup?: boolean };
const pending = new Map<string, Promise<Artwork>>();
const queue: Array<() => void> = [];
let running = 0;
let nextCatalogueRequest = 0;
async function clientCatalogue(endpoint: string): Promise<Artwork | null> {
  const params = new URL(endpoint).searchParams;
  const album = params.get('type') === 'album';
  const artist = params.get('artist') || '';
  const title = params.get(album ? 'album' : 'track') || '';
  // Apple's public endpoint permits CORS. Use the visitor's connection only
  // when its shared datacentre endpoint is unavailable; no credentials leave
  // the Worker. Space requests below the catalogue's approximate 20/min limit.
  for (const term of [artist + ' ' + title, title]) {
    const slot = Math.max(Date.now(), nextCatalogueRequest);
    nextCatalogueRequest = slot + 3200;
    if (slot > Date.now()) await new Promise(resolve => window.setTimeout(resolve, slot - Date.now()));
    const url = new URL('https://itunes.apple.com/search');
    url.search = new URLSearchParams({ term, media: 'music', entity: album ? 'album' : 'song', country: 'IN', limit: '20' }).toString();
    const response = await fetch(url, { cache: 'force-cache', signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json() as { results?: CatalogItem[] };
    const item = data.results?.find(value => matchCatalog(value, artist, title, album));
    if (item?.artworkUrl100) {
      const image = new URL(item.artworkUrl100);
      const sourceValue = album ? item.collectionViewUrl : item.trackViewUrl;
      if (!sourceValue) continue;
      const source = new URL(sourceValue);
      if (image.protocol === 'https:' && image.hostname.endsWith('.mzstatic.com') && source.protocol === 'https:' && /(^|\.)apple\.com$/.test(source.hostname)) {
        return { image: image.href.replace(/\/100x100bb\./, '/600x600bb.'), source: 'apple', sourceUrl: source.href };
      }
    }
  }
  return null;
}
function drain() {
  while (running < 3 && queue.length) { running++; queue.shift()!(); }
}
export function resolveArtwork(endpoint: string): Promise<Artwork> {
  const identity = new URL(endpoint);
  const isArtist = identity.pathname.endsWith('/artist-image');
  if (identity.searchParams.get('type') !== 'album') identity.searchParams.delete('album');
  const cacheKey = identity.href;
  const existing = pending.get(cacheKey);
  if (existing) return existing;
  try {
    const saved = JSON.parse(localStorage.getItem('muzix-art-v1:' + cacheKey) || 'null');
    if (saved?.expires > Date.now() && saved.value?.image) {
      const image = new URL(saved.value.image);
      const link = new URL(saved.value.sourceUrl);
      if (image.protocol === 'https:' && image.hostname.endsWith('.mzstatic.com') && link.protocol === 'https:' && /(^|\.)apple\.com$/.test(link.hostname)) {
        return Promise.resolve(saved.value as Artwork);
      }
    }
  } catch { /* Storage can be disabled without affecting the feed. */ }
  const result = new Promise<Artwork>(resolve => {
    queue.push(async () => {
      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(18000) });
        if (!response.ok) throw new Error('Artwork unavailable');
        const artwork = await response.json() as Artwork;
        const resolved = artwork.image || isArtist ? artwork : await clientCatalogue(endpoint) || artwork;
        if (resolved.image && resolved.source === 'apple') {
          try { localStorage.setItem('muzix-art-v1:' + cacheKey, JSON.stringify({ expires: Date.now() + 86400000, value: resolved })); } catch { /* Optional public-artwork cache. */ }
        }
        resolve(resolved);
      } catch { resolve({ image: '', source: null, sourceUrl: '' }); }
      finally { running--; drain(); }
    });
    drain();
  });
  if (pending.size > 500) pending.clear();
  pending.set(cacheKey, result);
  return result;
}
