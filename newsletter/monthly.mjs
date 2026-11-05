import { mkdir,writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fetchSnapshot } from './snapshot.mjs';
import { monthlyEmail } from './email.mjs';
import { enrichSnapshot } from './enrich.mjs';
export async function publishSnapshot({snapshot,key,segment,mode='draft',fetcher=fetch}){
  if(snapshot.partial)throw new Error('A month-so-far preview cannot be published or sent.');
  if(!key||!segment)throw new Error('Resend credentials and Muzix segment are required.');
  if(!['draft','send'].includes(mode))throw new Error('Invalid publishing mode.');
  let nextRequest=0;
  async function api(path,method='GET',body){
    // Stay below the account API limit. Only read requests are retried here;
    // an ambiguous write stops the run and is reconciled by listing on rerun.
    for(let attempt=0;attempt<3;attempt++){
      await new Promise(r=>setTimeout(r,Math.max(0,nextRequest-Date.now())));nextRequest=Date.now()+650;
      const response=await fetcher('https://api.resend.com'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
      if(method==='GET'&&(response.status===429||response.status>=500)&&attempt<2){await new Promise(r=>setTimeout(r,2000));continue;}
      const data=await response.json();if(!response.ok)throw new Error(`Resend ${method} failed (${response.status}); inspect the broadcast before rerunning.`);return data;
    }
  }
  const name='muzix-monthly-'+snapshot.month;
  let after='',matches=[];
  do{const page=await api('/broadcasts?limit=100'+(after?'&after='+encodeURIComponent(after):''));if(!Array.isArray(page.data))throw new Error('Could not inspect existing broadcasts.');matches.push(...page.data.filter(x=>x.name===name));after=page.has_more?page.data.at(-1)?.id:'';if(page.has_more&&!after)throw new Error('Invalid broadcast pagination.');}while(after);
  if(matches.length>1)throw new Error('Duplicate edition names exist. Resolve them in Resend before sending.');
  let broadcast=matches[0];
  if(broadcast&&(broadcast.segment_id||broadcast.audience_id)!==segment)throw new Error('Existing edition belongs to another segment.');
  if(broadcast&&broadcast.status!=='draft'){
    if(['sent','scheduled','sending','queued'].includes(broadcast.status))return {status:'already-'+broadcast.status,id:broadcast.id};
    throw new Error('Existing edition is not a sendable draft; inspect it in Resend.');
  }
  const email=monthlyEmail(snapshot);
  const body={segment_id:segment,from:'Muzix <notes@muzix.avrxt.dev>',name,...email};
  if(!broadcast){const created=await api('/broadcasts','POST',body);if(!created.id)throw new Error('Resend returned no broadcast ID.');broadcast={id:created.id,status:'draft'};}
  else await api('/broadcasts/'+broadcast.id,'PATCH',body);
  if(mode==='send')await api('/broadcasts/'+broadcast.id+'/send','POST',{});
  return {status:mode==='send'?'sent':'draft',id:broadcast.id};
}
async function main(){
  const mode=process.env.NEWSLETTER_MODE||'preview';
  if(!['preview','draft','send'].includes(mode))throw new Error('Use preview, draft, or send mode.');
  const raw=await fetchSnapshot({key:process.env.LASTFM_API_KEY,username:process.env.LASTFM_USERNAME||'avrxt',month:process.env.NEWSLETTER_MONTH||undefined,allowCurrent:mode==='preview'});
  const snapshot=await enrichSnapshot(raw,{key:process.env.LASTFM_API_KEY});
  const email=monthlyEmail(snapshot);await mkdir('newsletter-output',{recursive:true});
  await Promise.all([writeFile('newsletter-output/snapshot.json',JSON.stringify(snapshot,null,2)),writeFile('newsletter-output/email.html',email.html),writeFile('newsletter-output/email.txt',email.text)]);
  const result=mode==='preview'?{status:'preview'}:await publishSnapshot({snapshot,key:process.env.MUZIX_RESEND_API_KEY,segment:process.env.MUZIX_SEGMENT_ID,mode});
  console.log(JSON.stringify({month:snapshot.month,scrobbles:snapshot.scrobbles,...result}));
  if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`Muzix ${snapshot.month}: ${result.status}. ${snapshot.scrobbles} completed scrobbles; ${snapshot.uniqueArtists} artists.\n`,{flag:'a'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);console.error('Monthly snapshot failed. No automatic write retry was attempted; inspect the run and Resend before rerunning.');process.exitCode=1;});
