import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
export default function LoginPage(){return <main className="container"><section className="form-card"><span className="eyebrow">Account</span><h2 style={{marginTop:12}}>Welcome back</h2><p className="muted">Sign in to manage cart, prescriptions, and orders.</p><Suspense><AuthForm mode="login"/></Suspense><p className="small muted">New here? <Link href="/register"><b>Create an account</b></Link></p></section></main>}
