import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthWindow,summarizeScrobbles,fetchSnapshot} from './snapshot.mjs';
import {confirmationEmail,welcomeEmail,monthlyEmail} from './email.mjs';
import {publishSnapshot} from './monthly.mjs';
import {handleNewsletter,newsletterToken,readNewsletterToken} from '../worker/newsletter.mjs';
const now=Date.parse('2026-11-05T12:00:00Z');
const window=monthWindow(undefined,now);
const entry=(artist,title,uts=window.from)=>({artist:{'#text':artist},name:title,album:{'#text':'Album'},url:'https://www.last.fm/music/a/b',date:{uts:String(uts)}});
const snapshot=summarizeScrobbles([entry('A','Song'),entry('A','Song'),entry('B','Other')],window,3);
test('calendar month uses India boundaries, completed scrobbles and full counts',async()=>{
  assert.equal(window.month,'2026-10');assert.equal(new Date(window.from*1000).toISOString(),'2026-09-30T18:30:00.000Z');
  assert.equal(monthWindow(undefined,Date.parse('2026-10-31T18:30:00Z')).month,'2026-10');
  assert.throws(()=>monthWindow('2026-11',now),/completed/);
  assert.equal(snapshot.scrobbles,3);assert.equal(snapshot.uniqueArtists,2);assert.equal(snapshot.tracks[0].plays,2);
  assert.throws(()=>summarizeScrobbles([entry('A','Song',window.to)],window,1),/Incomplete/);
  let calls=0;const result=await fetchSnapshot({key:'test',now,fetcher:async()=>{calls++;return Response.json({recenttracks:{'@attr':{total:'0',totalPages:'0'},track:[]}});}});
  assert.equal(result.scrobbles,0);assert.equal(calls,1);
});
test('all templates have signature, safe HTML and monthly native unsubscribe',()=>{
  for(const email of [confirmationEmail('https://muzix.avrxt.dev/subscribe#token=test'),welcomeEmail('https://muzix.avrxt.dev/subscribe#unsubscribe=test'),monthlyEmail(snapshot)]){
    assert.match(email.html,/with 🩶 @avrxt/);assert.match(email.text,/with 🩶 @avrxt/);assert.match(email.html,/Outfit,Inter/);assert.match(email.html,/Space Mono/);assert.doesNotMatch(email.html,/<script/);
  }
  const hostile=monthlyEmail({...snapshot,artists:[{name:'<img src=x onerror=alert(1)>',url:'javascript:alert(1)',plays:1}]});
  assert.match(hostile.html,/&lt;img/);assert.doesNotMatch(hostile.html,/href="javascript/);assert.match(hostile.html,/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/);
});
test('signed opt-in rejects tampering, expiry, wrong purpose and GET scanners',async()=>{
  const token=await newsletterToken('secret','reader@example.com','confirm',now+1000);
  assert.equal((await readNewsletterToken('secret',token,'confirm',now)).email,'reader@example.com');
  assert.equal(await readNewsletterToken('secret',token+'x','confirm',now),null);
  assert.equal(await readNewsletterToken('secret',token,'unsubscribe',now),null);
  assert.equal(await readNewsletterToken('secret',token,'confirm',now+1000),null);
  assert.equal((await handleNewsletter(new Request('https://api.avrxt.dev/v1/music/confirm'),{})).status,405);
});
test('signup requires consent, confirms before segment join, preserves opt-outs and removes only Muzix',async()=>{
  const original=globalThis.fetch;const calls=[];let contact=null;
  globalThis.fetch=async(url,options)=>{calls.push({url,options});if(url.includes('/contacts/')&&options.method==='GET')return contact?Response.json(contact):Response.json({}, {status:404});return Response.json({id:'ok'});};
  const env={MUZIX_RESEND_API_KEY:'test',MUZIX_SEGMENT_ID:'muzix',MUZIX_NEWSLETTER_SECRET:'secret',MAIL_AI_LIMITER:{limit:async()=>({success:true})}};
  const request=(path,body,origin='https://muzix.avrxt.dev')=>new Request('https://api.avrxt.dev/v1/music/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    assert.equal((await handleNewsletter(request('subscribe',{email:'reader@example.com',consent:true},'https://evil.example'),env)).status,403);
    assert.equal((await handleNewsletter(request('subscribe',{email:'reader@example.com'}),env)).status,400);
    assert.equal((await handleNewsletter(request('subscribe',{email:'reader@example.com',consent:true}),env)).status,200);
    assert.equal(calls.length,1);assert.match(calls[0].url,/\/emails$/);assert.match(calls[0].options.headers['Idempotency-Key'],/^muzix-confirm-/);
    const mail=JSON.parse(calls[0].options.body);const token=mail.text.match(/#token=([^\s]+)/)[1];
    assert.equal((await handleNewsletter(request('confirm',{token}),env)).status,200);
    assert.ok(calls.some(x=>x.url.endsWith('/segments/muzix')&&x.options.method==='POST'));
    contact={unsubscribed:true};assert.equal((await handleNewsletter(request('confirm',{token}),env)).status,409);
    const unsubscribe=await newsletterToken('secret','reader@example.com','unsubscribe',0);
    assert.equal((await handleNewsletter(request('unsubscribe',{token:unsubscribe}),env)).status,200);
    assert.equal(calls.at(-1).options.method,'DELETE');assert.match(calls.at(-1).url,/\/segments\/muzix$/);
  }finally{globalThis.fetch=original;}
});
test('monthly reruns reuse a draft and skip already-sent editions',async()=>{
  const calls=[];let state='draft';
  const fetcher=async(url,options)=>{calls.push({url,...options});return Response.json(url.includes('?')?{data:[{id:'edition',name:'muzix-monthly-2026-10',segment_id:'muzix',status:state}],has_more:false}:{id:'edition'});};
  const result=await publishSnapshot({snapshot,key:'test',segment:'muzix',mode:'send',fetcher});
  assert.equal(result.status,'sent');assert.deepEqual(calls.map(c=>c.method),['GET','PATCH','POST']);
  state='sent';calls.length=0;assert.equal((await publishSnapshot({snapshot,key:'test',segment:'muzix',mode:'send',fetcher})).status,'already-sent');assert.equal(calls.length,1);
});
