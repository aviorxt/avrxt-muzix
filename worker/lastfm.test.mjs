import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMuzix, musicMonth } from './lastfm.mjs';
const store = new Map();
globalThis.caches = { open: async () => ({ match: async key => store.get(key.url)?.clone(), put: async (key, value) => store.set(key.url, value.clone()) }) };
const env = { LASTFM_API_KEY: 'test-key', LASTFM_USERNAME: 'avrxt' };
const request = () => new Request('https://api.avrxt.dev/v1/music/chart?user=someone-else');
const stamp = String(Math.floor(Date.now()/1000)-300);
const played = { name: 'Song', artist: { '#text': 'Artist' }, album: { '#text': 'Album' }, date: { uts: stamp }, image: [{ '#text': 'https://example.com/cover.jpg' }], url: 'https://www.last.fm/music/Artist/_/Song' };
let calls = 0, fails = false, playing = true, pages = 1;
globalThis.fetch = async input => {
  calls++;
  const url = new URL(input);
  assert.equal(url.searchParams.get('user'), 'avrxt');
  assert.equal(url.searchParams.get('api_key'), 'test-key');
  if (fails) return Response.json({ error: 29, message: 'Rate limited' });
  const method = url.searchParams.get('method');
  if (method === 'user.getRecentTracks') {
    const month = url.searchParams.has('from');
    return Response.json({ recenttracks: { track: month ? [played, played] : [...(playing ? [{ ...played, date: undefined, '@attr': { nowplaying: 'true' } }] : []), played], '@attr': { total: month ? '2' : '1', totalPages: String(month ? pages : 1) } } });
  }
  if (method === 'user.getTopArtists') return Response.json({ topartists: { artist: [{ name:'Artist', playcount:'2', url:'javascript:alert(1)' }] } });
  if (method === 'user.getTopTracks') return Response.json({ toptracks: { track: [{ ...played, playcount:'2' }] } });
  if (method === 'user.getTopAlbums') return Response.json({ topalbums: { album: [{ name:'Album', artist: { name:'Artist' }, playcount:'2' }] } });
  return Response.json({ user: { playcount:'55' } });
};
async function ageRecent() {
  for (const [key,response] of store) if(key.endsWith('/recent')) {
    const value = await response.json(); value.fetchedAt = Date.now()-90000;
    store.set(key,Response.json(value));
  }
}
test('Last.fm migration handles live, cache, stale, resume, monthly coverage and guards', async () => {
  let result = await handleMuzix(request(),env);
  let chart = await result.json();
  assert.equal(chart.nowPlaying.title,'Song');
  assert.equal(chart.recentTracks.length,1);
  assert.equal(chart.capsule.onLoop.plays,2,'repeated listens must remain separate');
  assert.equal(chart.capsule.complete,true);
  assert.equal(chart.totalScrobbles,55);
  assert.equal(chart.topArtists[0].url,'','reject unsafe links');
  assert.equal(chart.nowPlaying.progressMs,undefined);
  const before = calls;
  await Promise.all(Array.from({length:10},()=>handleMuzix(request(),env)));
  assert.equal(calls,before,'all visitors share cache');
  await ageRecent(); fails=true;
  chart=await(await handleMuzix(request(),env)).json();
  assert.equal(chart.stale,true); assert.equal(chart.nowPlaying,null); assert.equal(chart.recentTracks.length,1);
  const failedCalls=calls;
  await handleMuzix(request(),env); assert.equal(calls,failedCalls,'back off after API error');
  store.clear(); fails=false; playing=false;
  chart=await(await handleMuzix(request(),env)).json();
  assert.equal(chart.nowPlaying,null); assert.equal(chart.stale,false);
  store.clear(); fails=true;
  result=await handleMuzix(request(),env); assert.equal(result.status,502);
  assert.equal((await handleMuzix(request(),{})).status,503);
  assert.equal((await handleMuzix(new Request(request(),{method:'POST'}),env)).status,405);
  fails=false; store.clear(); pages=11;
  chart=await(await handleMuzix(request(),env)).json();
  assert.equal(chart.capsule.complete,false);
  assert.equal(musicMonth(Date.parse('2026-10-31T18:30:00Z')).from, Date.parse('2026-10-31T18:30:00Z')/1000);
  assert.equal(musicMonth(Date.parse('2026-10-31T18:29:59Z')).label,'October 2026');
});
