'use client';
import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthForm({ mode }: { mode:'login'|'register' }) {
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const router=useRouter(); const search=useSearchParams();
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError('');
    const data=new FormData(e.currentTarget);
    const payload=Object.fromEntries(data.entries());
    const res=await fetch(`/api/auth/${mode}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const body=await res.json().catch(()=>({}));
    if(!res.ok){setError(body.message??'Request failed');setBusy(false);return;}
    router.push(search.get('next') || '/'); router.refresh();
  }
  return <form className="form-grid" onSubmit={submit}>
    {mode==='register'&&<div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" required minLength={2} autoComplete="name"/></div>}
    <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email"/></div>
    <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={10} autoComplete={mode==='login'?'current-password':'new-password'}/></div>
    {error&&<div className="alert" role="alert">{error}</div>}
    <button className="btn btn-primary" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button>
  </form>;
}
