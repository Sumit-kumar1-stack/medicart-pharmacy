import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';

export default async function HomePage() {
  const [products, rxCount, batches] = await Promise.all([
    prisma.product.findMany({where:{active:true},orderBy:{createdAt:'asc'},take:8}),
    prisma.product.count({where:{active:true,prescriptionRequired:true}}),
    prisma.inventoryBatch.count({where:{status:'ACTIVE',quantityAvailable:{gt:0}}})
  ]);
  return <main>
    <section className="hero"><div className="container hero-grid">
      <div className="hero-main"><span className="eyebrow">Digital pharmacy demo</span><h1>Healthcare shopping with a safer prescription workflow.</h1><p>Browse wellness essentials and medicines, upload a prescription for restricted items, and track pharmacist review and fulfillment in one place.</p><div className="hero-actions"><Link className="btn btn-primary" href="/medicines">Shop medicines</Link><Link className="btn" href="/prescriptions">Upload prescription</Link></div></div>
      <div className="hero-side"><div className="stat-card"><strong>{products.length}+</strong><span>Featured demo products</span></div><div className="stat-card"><strong>{rxCount}</strong><span>Prescription-controlled demo listings</span></div><div className="stat-card"><strong>{batches}</strong><span>Active traceable inventory batches</span></div></div>
    </div></section>
    <section className="section"><div className="container"><div className="section-head"><div><h2>Popular health essentials</h2><p>Seeded catalog data for demonstration and testing.</p></div><Link href="/medicines">View all →</Link></div><div className="grid">{products.map((p)=><ProductCard key={p.id} product={p}/>)}</div></div></section>
    <section className="section"><div className="container two-col"><div className="panel"><span className="eyebrow">Prescription safety</span><h2 style={{marginTop:12}}>Human review before checkout</h2><p className="muted">Prescription items cannot be checked out until an authorized pharmacist/admin approves the uploaded document and explicitly authorizes matching catalog products.</p><Link className="btn" href="/prescriptions">Prescription center</Link></div><div className="panel"><span className="eyebrow">Inventory controls</span><h2 style={{marginTop:12}}>Batch & expiry aware</h2><p className="muted">Order allocation uses eligible stock ordered by earliest expiry first (FEFO) and excludes expired, recalled, or quarantined batches.</p></div></div></section>
  </main>;
}
