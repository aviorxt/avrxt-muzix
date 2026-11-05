'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { apiUrl } from '@/lib/api-gateway';
export default function Subscribe() {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;const form=event.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');setError(false);
    try{const response=await fetch(apiUrl('/v1/music/subscribe'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.get('email'),website:data.get('website'),consent:data.get('consent')==='on'}),signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again shortly.');setMessage(result.message);form.reset();}catch(cause){setError(true);setMessage(cause instanceof Error?cause.message:'Could not subscribe. Please try again.');}finally{setBusy(false);}
  }
  return <section className="newsletter-section" id="subscribe" aria-labelledby="newsletter-heading"><div><span className="eyebrow">06 / THE MONTHLY FREQUENCY</span><h2 id="newsletter-heading">Stay in<br/>the rotation.</h2><p>A month in music, delivered.<br/>Top artists, tracks on repeat, and a snapshot of @avrxt’s listening.</p><span className="newsletter-signature">with 🩶 @avrxt</span></div><form onSubmit={submit}><label htmlFor="newsletter-email" className="eyebrow">YOUR EMAIL</label><div className="subscribe-input"><Input id="newsletter-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required disabled={busy}/><Button type="submit" disabled={busy}>{busy?'JOINING…':'SUBSCRIBE'}<ArrowUpRight size={16}/></Button></div><div className="newsletter-trap" aria-hidden="true"><label>Leave empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div><label className="subscribe-consent"><Checkbox name="consent" required disabled={busy}/><span>Send me Muzix snapshots and occasional special editions. I can unsubscribe any time.</span></label><p className="subscribe-note">Confirm your email to join. Usually monthly, with occasional special editions. Email managed by Resend. Read our <Link href="/privacy">Privacy policy</Link> and <Link href="/terms">Terms</Link>.</p>{message&&<p role={error?'alert':'status'} className={error?'feed-error':'subscribe-success'}>{message}</p>}</form></section>;
}
