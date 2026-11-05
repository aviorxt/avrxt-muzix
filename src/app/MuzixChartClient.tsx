'use client';
import Subscribe from '@/components/Subscribe';
import MotionEffects from '@/components/MotionEffects';
import { Button } from '@/components/ui/button';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Disc3, RefreshCw, Radio, Headphones, Music2 } from 'lucide-react';
import { apiUrl } from '@/lib/api-gateway';
import type { MusicChart, MusicTrack } from '@/lib/music';
import Cover from '@/components/Cover';
import ArtistPortrait from '@/components/ArtistPortrait';
const number = (value: number) => value.toLocaleString('en');
function ago(date: string | null, now: number) {
  if (!date) return '';
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
  return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}
function TrackRow({ track, rank, time, now }: { track: MusicTrack; rank: number; time?: boolean; now: number }) {
  return <div className="track-row"><span className="row-rank">{String(rank).padStart(2, '0')}</span><Cover image={track.image} title={track.title} artist={track.artist} album={track.album} /><span className="row-text"><a href={track.url || undefined} target="_blank" rel="noreferrer"><strong>{track.title}</strong></a><span>{track.artist}</span></span><span className="row-detail">{time ? <time dateTime={track.playedAt || undefined}>{ago(track.playedAt, now)}</time> : `${number(track.plays)} plays`}</span><a className="row-external" href={track.url || undefined} target="_blank" rel="noreferrer" aria-label={`View ${track.title} on Last.fm`}><ArrowUpRight size={14} /></a></div>;
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
  return <main className="music-page"><MotionEffects />
    <nav className="site-nav"><a className="wordmark" href="https://www.avrxt.dev">AVRXT<span> / </span>MUZIX<span className="nav-edition">/ 03</span></a><div className="nav-links"><a href="https://www.avrxt.dev">HOME <ArrowUpRight size={12} /></a><a href="https://me.avrxt.dev">PROFILE <ArrowUpRight size={12} /></a><a href={data?.profileUrl || 'https://www.last.fm/user/avrxt'} target="_blank" rel="noreferrer">LAST.FM <ArrowUpRight size={12} /></a></div></nav>
    <div className="music-shell">
      <header className="music-header"><div className="eyebrow"><span className="tiny-cross">✳</span> PERSONAL_FREQUENCY <span className="header-owner">LISTENING ARCHIVE / 01</span></div><div className="title-line"><h1>Muzix<span>chart.</span></h1><div className="intro"><Headphones size={25} strokeWidth={1.3} /><p>Current listening. Recent rotation.<br />The tracks and artists<br />that stay in the signal.</p><a href="#rotation">EXPLORE THE ROTATION <ArrowDown size={13} /></a></div></div></header>
      <section className="listening-section" aria-labelledby="listening-heading">
        <div className="section-line"><h2 id="listening-heading">01 / THE CURRENT SOUND</h2><span className={`status ${live ? 'is-live' : ''}`} role="status"><i />{!data ? (error ? 'FEED UNAVAILABLE' : 'CONNECTING') : stale ? 'FEED DELAYED' : live ? 'SCROBBLING NOW' : 'BETWEEN TRACKS'}</span></div>
        <div className="now-grid"><article className="now-art"><Cover image={track?.image} title={track?.title || ''} artist={track?.artist || ''} album={track?.album} eager /><div className="art-sticker"><Music2 size={13} /> AUDIO_SIGNAL</div></article><article className="now-info"><div className="now-top"><span className="eyebrow">{live ? 'NOW_PLAYING' : 'LAST_PLAYED'}</span><span className="equalizer" aria-hidden="true" data-live={!!live}><i /><i /><i /><i /><i /></span></div><div className="now-title"><h3>{track?.title || (loading ? 'Tuning in…' : 'A quiet moment.')}</h3><p>{track?.artist || 'The next song will find its way here.'}</p>{track?.album && <span className="album-name">{track.album}</span>}</div><div className="now-bottom"><p>{live ? 'Reported now playing by Last.fm' : stale ? 'Showing the last available listening history' : track?.playedAt ? `Last scrobbled ${ago(track.playedAt, clock)}` : 'Waiting for the first scrobble'}</p>{track?.url && <a className="text-link" href={track.url} target="_blank" rel="noreferrer">VIEW TRACK <ArrowUpRight size={15} /></a>}</div></article></div>
        <div className="feed-note"><span>Near-live listening, via Last.fm. Updates about every 30 seconds.</span><Button variant="ghost" onClick={refresh} disabled={loading} aria-label="Refresh listening feed"><RefreshCw size={12} className={loading ? 'spin' : ''} /> {loading ? 'CHECKING' : 'REFRESH'}</Button></div>
        {error && <p className="feed-error" role="alert">{error} {data && 'Your last available history is still shown.'}</p>}
      </section>
      <section className="month-section" aria-labelledby="month-heading"><div className="month-heading"><span className="eyebrow">A MONTH IN MUSIC</span><h2 id="month-heading">{month?.label || 'Month so far'}<span> /</span></h2><p>{month?.complete === false ? `Based on ${number(month.counted)} fetched scrobbles. Full month: ${number(month.scrobbles)}.` : 'A snapshot of the current chapter.'}<br />Calendar month · India Standard Time</p></div><div className="month-stats"><div><span className="stat-value">{month ? number(month.scrobbles) : '—'}</span><span className="eyebrow">SCROBBLES THIS MONTH</span></div><div><span className="stat-value">{month ? number(month.uniqueArtists) : '—'}{month?.complete === false ? '+' : ''}</span><span className="eyebrow">DIFFERENT ARTISTS</span></div><div className="artist-stat"><span className="eyebrow">MOST PLAYED ARTIST</span><strong>{month?.topArtist || 'Still taking shape'}</strong><span className="stat-caption">{month?.complete === false ? 'Within fetched history' : 'Setting the mood'}</span></div></div></section>
      <section id="rotation" className="rotation-section" aria-labelledby="rotation-heading"><div className="section-line"><h2 id="rotation-heading">02 / HEAVY ROTATION</h2><span>{data?.chartPeriod || 'LAST 30 DAYS'}</span></div><div className="section-heading"><h3>Top artists<span className="heading-dot">.</span></h3><p>The artists getting the most airtime.<br />Ranked by scrobbles, one play at a time.</p></div>{data?.chartsStale && <p className="feed-error">Charts are delayed. Showing the last available stats.</p>}<div className="artist-grid">{data?.topArtists.map((artist, index) => <article key={artist.name} className="artist-card"><ArtistPortrait name={artist.name} image={artist.image} rank={index + 1} /><h4><a href={artist.url || undefined} target="_blank" rel="noreferrer">{artist.name}</a></h4><span>{number(artist.plays)} plays</span></article>)}</div>{data && !data.topArtists.length && <p className="empty-note">The rotation starts with your first scrobbles.</p>}</section>
      <section className="tracks-section"><article><div className="section-line"><h2>03 / THE REPEAT OFFENDERS</h2><Disc3 size={14} /></div><h3 className="list-title">Top tracks.</h3><p className="list-subtitle">Most played tracks · Last 30 days</p><div className="track-list">{data?.topTracks.map((item, index) => <TrackRow key={item.id} track={item} rank={index + 1} now={clock} />)}</div>{data && !data.topTracks.length && <p className="empty-note">No charted tracks yet.</p>}</article><article><div className="section-line"><h2>04 / FRESH OFF THE RECORD</h2><Radio size={14} /></div><h3 className="list-title">Recent rotation.</h3><p className="list-subtitle">The latest completed scrobbles</p><div className="track-list">{data?.recentTracks.slice(0, 10).map((item, index) => <TrackRow key={`${item.id}-${item.playedAt}-${index}`} track={item} rank={index + 1} time now={clock} />)}</div>{data && !data.recentTracks.length && <p className="empty-note">Completed listens will appear here.</p>}</article></section>
      {month?.onLoop && <aside className="on-loop"><span className="eyebrow">ONE MORE TIME ↻</span><p>Apparently, I’m not done with <a href={month.onLoop.url || undefined} target="_blank" rel="noreferrer">{month.onLoop.title} <ArrowUpRight size={22} /></a></p><span>{number(month.onLoop.plays)} scrobbles {month.complete ? 'this month' : 'in fetched monthly history'}. And counting.</span></aside>}
      <section className="albums-section" aria-labelledby="albums-heading"><div className="section-line"><h2 id="albums-heading">05 / ON THE SHELF</h2><span>ALBUMS · LAST 30 DAYS</span></div><div className="album-grid">{data?.topAlbums.map(album => <article key={`${album.artist}-${album.name}`}><Cover image={album.image} title={album.name} artist={album.artist} album={album.name} albumOnly /><a href={album.url || undefined} target="_blank" rel="noreferrer"><h3>{album.name}</h3></a><p>{album.artist}</p><span>{number(album.plays)} plays</span></article>)}</div></section>
      <Subscribe />
      <footer className="music-footer"><div><a className="wordmark" href="https://www.avrxt.dev">AVRXT / MUZIX</a><p>A personal archive. Always in progress.</p></div><div><a href={data?.profileUrl || 'https://www.last.fm/user/avrxt'} target="_blank" rel="noreferrer">POWERED BY LAST.FM <ArrowUpRight size={12} /></a><p>{data?.totalScrobbles != null ? `${number(data.totalScrobbles)} lifetime scrobbles` : 'Listening history & charts'}{data && <> · Checked <time dateTime={new Date(data.checkedAt).toISOString()}>{new Date(data.checkedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</time></>}</p></div></footer>
    </div>
  </main>;
}
