'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddToCartButton({ productId, compact=false }: { productId:string; compact?:boolean }) {
  const [state,setState] = useState<'idle'|'busy'|'done'>('idle');
  const router = useRouter();
  async function add() {
    setState('busy');
    const res = await fetch('/api/cart',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({productId,quantity:1})});
    if (res.status===401) { router.push('/login?next=/cart'); return; }
    if (!res.ok) { alert((await res.json()).message ?? 'Unable to add to cart'); setState('idle'); return; }
    setState('done'); router.refresh();
  }
  return <button type="button" className="btn btn-primary" onClick={add} disabled={state==='busy'}>{state==='busy'?'Adding…':state==='done'?'Added ✓':compact?'Add':'Add to cart'}</button>;
}
