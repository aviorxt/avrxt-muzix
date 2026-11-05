export function normalizeMusic(value: string, isTitle = false) {
  const text = isTitle ? value.replace(/\s*(?:[-�]\s*)?\(?from\s+.*$/i, '') : value;
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}
export type CatalogItem = { artistName?: string; trackName?: string; collectionName?: string; artworkUrl100?: string; trackViewUrl?: string; collectionViewUrl?: string };
export function matchCatalog(item: CatalogItem, artist: string, title: string, album: boolean) {
  const name = (album ? item.collectionName : item.trackName) || '';
  const trim = (value: string) => album ? value.replace(/\s*[-–]\s*(single|ep)$/i, '') : value;
  const wanted = normalizeMusic(artist);
  return wanted.length >= 3 && normalizeMusic(item.artistName || '').includes(wanted) && normalizeMusic(trim(name), true) === normalizeMusic(trim(title), true);
}
