'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Disc3, RefreshCw, Radio, Headphones, Music2 } from 'lucide-react';
import { apiUrl } from '@/lib/api-gateway';
import type { MusicChart, MusicTrack } from '@/lib/music';
const number = (value: number) => value.toLocaleString('en');
function Art({ image, label, className = '' }: { image?: string; label: string; className?: string }) {
  return <div role="img" aria-label={label} className={`art ${className}`} style={image ? { backgroundImage: `url("${image.replace(/"/g, '%22')}")` } : undefined}>{!image && <Disc3 aria-hidden="true" />}</div>;
}
function ago(date: string | null, now: number) {
  if (!date) return '';
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
  return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}
function TrackRow({ track, rank, time, now }: { track: MusicTrack; rank: number; time?: boolean; now: number }) {
  return <a className="track-row" href={track.url || undefined} target="_blank" rel="noreferrer"><span className="row-rank">{String(rank).padStart(2, '0')}</span><Art image={track.image} label={`${track.title} artwork`} /><span className="row-text"><strong>{track.title}</strong><span>{track.artist}</span></span><span className="row-detail">{time ? <time dateTime={track.playedAt || undefined}>{ago(track.playedAt, now)}</time> : `${number(track.plays)} plays`}</span><ArrowUpRight size={14} /></a>;
}
export default function MuzixChartClient() {
  const [data, setData] = useState<MusicChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(0);
  const inflight = useRef(false);
  const receivedAt = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    const abort = new AbortController(); controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 25000);
    try {
      const response = await fetch(apiUrl('/v1/music/chart'), { cache: 'no-store', signal: abort.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The listening feed is temporarily unavailable.');
      if (payload.source !== 'lastfm' || !Array.isArray(payload.recentTracks) || !Number.isFinite(payload.checkedAt)) throw new Error('The listening feed returned an unexpected response.');
      if (!abort.signal.aborted) { receivedAt.current = Date.now(); setData(payload); setError(''); }
    } catch (cause) {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not refresh the listening feed.');
      else if (controller.current === abort) setError('The listening feed took too long to respond. Try refreshing.');
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === abort) { setLoading(false); inflight.current = false; }
    }
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (active && document.visibilityState === 'visible') void load(); };
    setClock(Date.now()); refresh();
    const poll = window.setInterval(refresh, 30000);
    const tick = window.setInterval(() => setClock(Date.now()), 10000);
    document.addEventListener('visibilitychange', refresh); window.addEventListener('focus', refresh);
    return () => {
      active = false; window.clearInterval(poll); window.clearInterval(tick);
      document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh);
      const pending = controller.current; controller.current = null; inflight.current = false; pending?.abort();
    };
  }, [load]);
  // Measure time since receipt locally; the visitor's clock can differ from
  // Cloudflare's clock. Server-side staleness is reported separately.
  const stale = !!data && (data.stale || !!error || clock - receivedAt.current > 75000);
  const live = !stale && data?.nowPlaying;
  const track = live || data?.recentTracks[0];
  const month = data?.capsule;
  const refresh = () => { setLoading(true); void load(); };
  return <main className="music-page">
    <nav className="site-nav"><a className="wordmark" href="https://www.avrxt.dev">AVRXT<span> / </span>MUZIX<span className="nav-edition">VOL. 01</span></a><a href={data?.profileUrl || 'https://www.last.fm/user/avrxt'} target="_blank" rel="noreferrer">LAST.FM <ArrowUpRight size={13} /></a></nav>
    <div className="music-shell">
      <header className="music-header"><div className="eyebrow"><span className="tiny-cross">✳</span> THE LISTENING JOURNAL <span className="header-owner">CURATED BY AVRXT</span></div><div className="title-line"><h1>Life on<span>repeat.</span></h1><div className="intro"><Headphones size={25} strokeWidth={1.3} /><p>A little window into my headphones.<br />The songs, the phases, the ones<br />I keep coming back to.</p><a href="#rotation">EXPLORE THE ROTATION <ArrowDown size={13} /></a></div></div></header>
      <section className="listening-section" aria-labelledby="listening-heading">
        <div className="section-line"><h2 id="listening-heading">01 / THE CURRENT SOUND</h2><span className={`status ${live ? 'is-live' : ''}`} role="status"><i />{!data ? (error ? 'FEED UNAVAILABLE' : 'CONNECTING') : stale ? 'FEED DELAYED' : live ? 'SCROBBLING NOW' : 'BETWEEN TRACKS'}</span></div>
        <div className="now-grid"><article className="now-art"><Art image={track?.image} label={track ? `${track.title} cover` : 'Waiting for a track'} /><div className="art-sticker"><Music2 size={13} /> AVRXT SELECTS</div></article><article className="now-info"><div className="now-top"><span className="eyebrow">{live ? 'ON THE NEEDLE RIGHT NOW' : 'LAST IN THE HEADPHONES'}</span><span className="equalizer" aria-hidden="true" data-live={!!live}><i /><i /><i /><i /><i /></span></div><div className="now-title"><h3>{track?.title || (loading ? 'Tuning in…' : 'A quiet moment.')}</h3><p>{track?.artist || 'The next song will find its way here.'}</p>{track?.album && <span className="album-name">{track.album}</span>}</div><div className="now-bottom"><p>{live ? 'Reported now playing by Last.fm' : stale ? 'Showing the last available listening history' : track?.playedAt ? `Last scrobbled ${ago(track.playedAt, clock)}` : 'Waiting for the first scrobble'}</p>{track?.url && <a className="text-link" href={track.url} target="_blank" rel="noreferrer">VIEW TRACK <ArrowUpRight size={15} /></a>}</div></article></div>
        <div className="feed-note"><span>Near-live listening, via Last.fm. Updates about every 30 seconds.</span><button onClick={refresh} disabled={loading} aria-label="Refresh listening feed"><RefreshCw size={12} className={loading ? 'spin' : ''} /> {loading ? 'CHECKING' : 'REFRESH'}</button></div>
        {error && <p className="feed-error" role="alert">{error} {data && 'Your last available history is still shown.'}</p>}
      </section>
      <section className="month-section" aria-labelledby="month-heading"><div className="month-heading"><span className="eyebrow">A MONTH IN MUSIC</span><h2 id="month-heading">{month?.label || 'Month so far'}<span> /</span></h2><p>{month?.complete === false ? `Based on ${number(month.counted)} fetched scrobbles. Full month: ${number(month.scrobbles)}.` : 'A snapshot of the current chapter.'}<br />Calendar month · India Standard Time</p></div><div className="month-stats"><div><span className="stat-value">{month ? number(month.scrobbles) : '—'}</span><span className="eyebrow">SCROBBLES THIS MONTH</span></div><div><span className="stat-value">{month ? number(month.uniqueArtists) : '—'}{month?.complete === false ? '+' : ''}</span><span className="eyebrow">DIFFERENT ARTISTS</span></div><div className="artist-stat"><span className="eyebrow">MOST PLAYED ARTIST</span><strong>{month?.topArtist || 'Still taking shape'}</strong><span className="stat-caption">{month?.complete === false ? 'Within fetched history' : 'Setting the mood'}</span></div></div></section>
      <section id="rotation" className="rotation-section" aria-labelledby="rotation-heading"><div className="section-line"><h2 id="rotation-heading">02 / HEAVY ROTATION</h2><span>{data?.chartPeriod || 'LAST 30 DAYS'}</span></div><div className="section-heading"><h3>The usual<br /><em>suspects.</em></h3><p>The artists getting the most airtime.<br />Ranked by scrobbles, one play at a time.</p></div>{data?.chartsStale && <p className="feed-error">Charts are delayed. Showing the last available stats.</p>}<div className="artist-grid">{data?.topArtists.map((artist, index) => <a key={artist.name} href={artist.url || undefined} target="_blank" rel="noreferrer" className="artist-card"><div className="artist-portrait"><Art image={artist.image} label={artist.name} /><span className="portrait-initial" aria-hidden="true">{!artist.image && artist.name.charAt(0)}</span><span className="artist-rank">{String(index + 1).padStart(2, '0')}</span><ArrowUpRight size={17} /></div><h4>{artist.name}</h4><span>{number(artist.plays)} plays</span></a>)}</div>{data && !data.topArtists.length && <p className="empty-note">The rotation starts with your first scrobbles.</p>}</section>
      <section className="tracks-section"><article><div className="section-line"><h2>03 / THE REPEAT OFFENDERS</h2><Disc3 size={14} /></div><h3 className="list-title">Can’t skip these.</h3><p className="list-subtitle">Most played tracks · Last 30 days</p><div className="track-list">{data?.topTracks.map((item, index) => <TrackRow key={item.id} track={item} rank={index + 1} now={clock} />)}</div>{data && !data.topTracks.length && <p className="empty-note">No charted tracks yet.</p>}</article><article><div className="section-line"><h2>04 / FRESH OFF THE RECORD</h2><Radio size={14} /></div><h3 className="list-title">Just listened.</h3><p className="list-subtitle">The latest completed scrobbles</p><div className="track-list">{data?.recentTracks.slice(0, 10).map((item, index) => <TrackRow key={`${item.id}-${item.playedAt}-${index}`} track={item} rank={index + 1} time now={clock} />)}</div>{data && !data.recentTracks.length && <p className="empty-note">Completed listens will appear here.</p>}</article></section>
      {month?.onLoop && <aside className="on-loop"><span className="eyebrow">ONE MORE TIME ↻</span><p>Apparently, I’m not done with <a href={month.onLoop.url || undefined} target="_blank" rel="noreferrer">{month.onLoop.title} <ArrowUpRight size={22} /></a></p><span>{number(month.onLoop.plays)} scrobbles {month.complete ? 'this month' : 'in fetched monthly history'}. And counting.</span></aside>}
      <section className="albums-section" aria-labelledby="albums-heading"><div className="section-line"><h2 id="albums-heading">05 / ON THE SHELF</h2><span>ALBUMS · LAST 30 DAYS</span></div><div className="album-grid">{data?.topAlbums.map(album => <a href={album.url || undefined} key={`${album.artist}-${album.name}`} target="_blank" rel="noreferrer"><Art image={album.image} label={`${album.name} cover`} /><h3>{album.name}</h3><p>{album.artist}</p><span>{number(album.plays)} plays</span></a>)}</div></section>
      <footer className="music-footer"><div><a className="wordmark" href="https://www.avrxt.dev">AVRXT / MUZIX</a><p>A personal archive. Always in progress.</p></div><div><a href={data?.profileUrl || 'https://www.last.fm/user/avrxt'} target="_blank" rel="noreferrer">POWERED BY LAST.FM <ArrowUpRight size={12} /></a><p>{data?.totalScrobbles != null ? `${number(data.totalScrobbles)} lifetime scrobbles` : 'Listening history & charts'}{data && <> · Checked <time dateTime={new Date(data.checkedAt).toISOString()}>{new Date(data.checkedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</time></>}</p></div></footer>
    </div>
  </main>;
}
