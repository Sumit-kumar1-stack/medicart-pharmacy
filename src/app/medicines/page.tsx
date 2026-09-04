import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { SearchBox } from '@/components/SearchBox';

export default async function MedicinesPage({searchParams}:{searchParams:Promise<{q?:string;rx?:string}>}) {
  const sp=await searchParams; const q=sp.q?.trim() ?? '';
  const products=await prisma.product.findMany({where:{active:true,...(sp.rx==='1'?{prescriptionRequired:true}:{}),...(q?{OR:[{name:{contains:q,mode:'insensitive'}},{genericName:{contains:q,mode:'insensitive'}},{brandName:{contains:q,mode:'insensitive'}},{manufacturer:{contains:q,mode:'insensitive'}},{composition:{contains:q,mode:'insensitive'}}]}:{})},orderBy:{name:'asc'}});
  return <main className="container"><div className="page-head"><span className="eyebrow">Catalog</span><h1 style={{fontSize:42}}>Medicines & wellness</h1><p className="muted">Search by product, generic name, composition, brand, or manufacturer.</p></div><div className="toolbar"><SearchBox initial={q}/></div>{products.length?<div className="grid">{products.map((p)=><ProductCard key={p.id} product={p}/>)}</div>:<div className="panel">No matching products found.</div>}</main>;
}
