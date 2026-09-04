import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
export default function RegisterPage(){return <main className="container"><section className="form-card"><span className="eyebrow">Customer signup</span><h2 style={{marginTop:12}}>Create your account</h2><p className="muted">Passwords require 10+ characters with upper/lowercase, number and symbol.</p><Suspense><AuthForm mode="register"/></Suspense><p className="small muted">Already registered? <Link href="/login"><b>Sign in</b></Link></p></section></main>}
