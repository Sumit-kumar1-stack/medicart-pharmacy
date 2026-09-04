'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function SearchBox({ initial = '' }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const router = useRouter();
  function submit(e: FormEvent) {
    e.preventDefault();
    router.push(`/medicines${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  }
  return <form className="search" onSubmit={submit} role="search">
    <input aria-label="Search medicines and health products" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search medicines, brands or health products" />
    <button type="submit">Search</button>
  </form>;
}
