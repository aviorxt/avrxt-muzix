import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMuzix, musicMatch } from './lastfm.mjs';
import { matchCatalog, normalizeMusic } from '../src/lib/catalog-match.ts';
test('artwork matching rejects wrong performers and alternate versions', () => {
  assert.equal(musicMatch({artistName:'Saurav Srisan',trackName:'Rathinamo'},'Saurav Srisan','Rathinamo'),true);
  assert.equal(musicMatch({artistName:'Saurav Srisan & Tanisha',trackName:'Rathinamo (Female Version)'},'Saurav Srisan','Rathinamo'),false);
  assert.equal(musicMatch({artistName:'Elder Jepson',trackName:'Winter Theme for a Queen'},'Dhilip Varman','Ennavaley'),false);
  assert.equal(musicMatch({artistName:'Sid Sriram & Shakthisree Gopalan',trackName:'Kannu Thangom'},'Sid Sriram','Kannu Thangom (From "Vaanam Kottattum")'),true);
  assert.equal(matchCatalog({artistName:'Saurav Srisan',trackName:'Rathinamo (Female Version)'},'Saurav Srisan','Rathinamo',false),false);
  assert.equal(matchCatalog({artistName:'Sid Sriram & Shakthisree Gopalan',trackName:'Kannu Thangom'},'Sid Sriram','Kannu Thangom (From "Vaanam Kottattum")',false),true);
  assert.equal(normalizeMusic('From First to Last'),'fromfirsttolast');
});
test('artwork endpoint uses detail metadata, verified fallback, caching and input guards', async () => {
  const store=new Map();let calls=0;
  globalThis.caches={open:async()=>({match:async key=>store.get(key.url)?.clone(),put:async(key,value)=>store.set(key.url,value.clone())})};
  globalThis.fetch=async input=>{
    calls++;const url=new URL(input);
    if(url.hostname==='ws.audioscrobbler.com')return Response.json({track:{album:{image:[]}}});
    return Response.json({results:[{artistName:'Other',trackName:'Rathinamo',artworkUrl100:'https://is1-ssl.mzstatic.com/wrong/100x100bb.jpg',trackViewUrl:'https://music.apple.com/in/song/1'},{artistName:'Saurav Srisan',trackName:'Rathinamo',artworkUrl100:'https://is1-ssl.mzstatic.com/right/100x100bb.jpg',trackViewUrl:'https://music.apple.com/in/song/2'}]});
  };
  const request=()=>new Request('https://api.avrxt.dev/v1/music/artwork?artist=Saurav+Srisan&track=Rathinamo');
  const env={LASTFM_API_KEY:'test'};
  const artwork=await(await handleMuzix(request(),env)).json();
  assert.match(artwork.image,/right\/600x600bb/);assert.equal(artwork.source,'apple');assert.match(artwork.sourceUrl,/song\/2/);
  await handleMuzix(request(),env);assert.equal(calls,2);
  assert.equal((await handleMuzix(new Request('https://api.avrxt.dev/v1/music/artwork'),env)).status,400);
});
test('artist portraits use exact-name Deezer artist records and reject generic images', async () => {
  const store=new Map();let calls=0;
  globalThis.caches={open:async()=>({match:async key=>store.get(key.url)?.clone(),put:async(key,value)=>store.set(key.url,value.clone())})};
  globalThis.fetch=async input=>{
    calls++;assert.equal(new URL(input).hostname,'api.deezer.com');
    return Response.json({data:[
      {name:'Siri Other',nb_fan:100000,picture_big:'https://cdn-images.dzcdn.net/images/artist/11111111111111111111111111111111/500.jpg',link:'https://www.deezer.com/artist/1'},
      {name:'Siri Xander',nb_fan:3,picture_big:'https://cdn-images.dzcdn.net/images/artist//500.jpg',link:'https://www.deezer.com/artist/2'},
      {name:'Siri Xander',nb_fan:2,picture_big:'https://cdn-images.dzcdn.net/images/artist/22222222222222222222222222222222/500.jpg',link:'https://www.deezer.com/artist/3'}
    ]});
  };
  const req=()=>new Request('https://api.avrxt.dev/v1/music/artist-image?artist=Siri+Xander');
  const result=await(await handleMuzix(req(),{LASTFM_API_KEY:'test'})).json();
  assert.equal(result.source,'deezer');assert.match(result.sourceUrl,/artist\/3$/);
  await handleMuzix(req(),{LASTFM_API_KEY:'test'});assert.equal(calls,1);
});
