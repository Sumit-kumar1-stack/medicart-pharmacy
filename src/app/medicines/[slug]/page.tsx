import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatInr } from '@/lib/money';
import { AddToCartButton } from '@/components/AddToCartButton';

export default async function MedicinePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const product=await prisma.product.findUnique({where:{slug},include:{category:true,batches:{where:{status:'ACTIVE',quantityAvailable:{gt:0}},orderBy:{expiresAt:'asc'}}}});
  if(!product||!product.active) notFound();
  const stock=product.batches.reduce((n,b)=>n+b.quantityAvailable,0);
  return <main className="container detail-grid"><div className="detail-visual"><span className="cross">+</span></div><section><span className="eyebrow">{product.category.name}</span><h1 style={{fontSize:46}}>{product.name}</h1><p className="muted">{product.description}</p><div className="price-row"><span className="price" style={{fontSize:30}}>{formatInr(product.pricePaise)}</span><span className="mrp">MRP {formatInr(product.mrpPaise)}</span></div>{product.prescriptionRequired&&<div className="alert" style={{margin:'16px 0'}}>Prescription required. You can add this item now, but checkout remains blocked until pharmacist approval.</div>}<div className="meta-list"><div className="meta-item"><b>Manufacturer</b>{product.manufacturer}</div><div className="meta-item"><b>Composition</b>{product.composition??'—'}</div><div className="meta-item"><b>Strength</b>{product.strength??'—'}</div><div className="meta-item"><b>Pack size</b>{product.packSize??'—'}</div><div className="meta-item"><b>Availability</b>{stock>0?`${stock} units across eligible batches`:'Out of stock'}</div><div className="meta-item"><b>Dispensing</b>{product.prescriptionRequired?'Pharmacist review required':'OTC / non-Rx demo flow'}</div></div>{stock>0&&<AddToCartButton productId={product.id}/>}<p className="small muted" style={{marginTop:18}}>Catalog information is for demonstration and is not a diagnosis, prescription, or personalized medical instruction.</p></section></main>;
}
