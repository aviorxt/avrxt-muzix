const IST=19800000;
export function monthWindow(value, now=Date.now(), allowCurrent=false){
  const local=new Date(now+IST);
  const current=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),1)-IST;
  const defaultMonth=new Date(current-1+IST).toISOString().slice(0,7);
  const month=value||defaultMonth;
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Use a completed month in YYYY-MM format.');
  const [year,index]=month.split('-').map(Number);
  const from=Date.UTC(year,index-1,1)-IST,to=Date.UTC(year,index,1)-IST;
  const partial=to>current;
  if(partial&&(!allowCurrent||from!==current))throw new Error('Only completed calendar months can be sent.');
  return {month,from:from/1000,to:Math.floor((partial?now:to)/1000),partial,label:new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(from))+(partial?' · month so far':'')};
}
const array=value=>Array.isArray(value)?value:value?[value]:[];
const text=value=>typeof value==='string'?value:value?.['#text']||value?.name||'';
export function summarizeScrobbles(raw,window,total){
  const tracks=new Map(),artists=new Map(),albums=new Map(),days=new Map();let counted=0;
  const weekdays=Array(7).fill(0);
  const url=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}};
  for(const item of raw){
    const timestamp=Number(item.date?.uts);
    if(item['@attr']?.nowplaying==='true'||!Number.isFinite(timestamp)||timestamp<window.from||timestamp>=window.to)continue;
    const artist=text(item.artist),title=text(item.name),album=text(item.album);
    if(!artist||!title)throw new Error('Last.fm returned an incomplete scrobble.');
    counted++;
    const local=new Date(timestamp*1000+IST),day=local.toISOString().slice(0,10);
    days.set(day,(days.get(day)||0)+1);weekdays[(local.getUTCDay()+6)%7]++;
    const image=array(item.image).map(x=>x?.['#text']).reverse().find(x=>x?.startsWith('https:')&&!/2a96cbd8b46e442fc41c2b86b821562f/.test(x))||'';
    const add=(map,key,value)=>map.set(key,{...value,plays:(map.get(key)?.plays||0)+1});
    add(artists,artist.toLowerCase(),{name:artist,url:'https://www.last.fm/music/'+encodeURIComponent(artist)});
    add(tracks,JSON.stringify([artist.toLowerCase(),title.toLowerCase()]),{title,artist,album,image,url:url(item.url)});
    if(album)add(albums,JSON.stringify([artist.toLowerCase(),album.toLowerCase()]),{name:album,artist,image,url:'https://www.last.fm/music/'+encodeURIComponent(artist)+'/'+encodeURIComponent(album)});
  }
  if(counted!==total)throw new Error('Incomplete monthly history; no newsletter will be sent.');
  const sorted=map=>[...map.values()].sort((a,b)=>b.plays-a.plays||(a.name||a.title).localeCompare(b.name||b.title));
  const trackCatalog=sorted(tracks),peak=[...days].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
  return {...window,timeZone:'Asia/Kolkata',scrobbles:counted,uniqueArtists:artists.size,uniqueTracks:tracks.size,activeDays:days.size,weekdays,peakDay:peak?{date:peak[0],plays:peak[1]}:null,repeatPercent:counted?Math.round((counted-tracks.size)/counted*100):0,trackCatalog,artists:sorted(artists).slice(0,5),tracks:trackCatalog.slice(0,10),albums:sorted(albums).slice(0,3)};
}
export async function fetchSnapshot({key,username='avrxt',month,now=Date.now(),allowCurrent=false,fetcher=fetch}){
  if(!key)throw new Error('LASTFM_API_KEY is required.');
  const window=monthWindow(month,now,allowCurrent);let raw=[],pages=1,total=0;
  for(let page=1;page<=pages;page++){
    const url=new URL('https://ws.audioscrobbler.com/2.0/');
    url.search=new URLSearchParams({method:'user.getRecentTracks',user:username,api_key:key,format:'json',from:String(window.from),to:String(window.to-1),limit:'200',page:String(page)}).toString();
    let data;
    for(let attempt=0;attempt<3;attempt++){
      try{const response=await fetcher(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Last.fm request failed.');data=await response.json();if(data.error||!data.recenttracks)throw new Error('Last.fm history unavailable.');break;}catch{if(attempt===2)throw new Error('Last.fm history unavailable; no newsletter was sent.');await new Promise(r=>setTimeout(r,1500*(attempt+1)));}
    }
    const attr=data.recenttracks['@attr'];
    const pageTotal=Number(attr?.total),pageCount=Number(attr?.totalPages)||1;
    if(!Number.isSafeInteger(pageTotal)||pageTotal<0||pageCount>500||pageCount<1||!Number.isInteger(pageCount))throw new Error('Unexpected history size; no newsletter was sent.');
    if(page===1){total=pageTotal;pages=pageCount;}else if(total!==pageTotal||pages!==pageCount)throw new Error('Monthly history changed during collection; rerun to get a consistent snapshot.');
    raw.push(...array(data.recenttracks.track));
    if(page<pages)await new Promise(r=>setTimeout(r,300));
  }
  return summarizeScrobbles(raw,window,total);
}
