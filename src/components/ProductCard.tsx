import Link from 'next/link';
import type { Product } from '@prisma/client';
import { formatInr } from '@/lib/money';
import { AddToCartButton } from './AddToCartButton';

export function ProductCard({ product }: { product: Product }) {
  return <article className="product-card">
    <Link href={`/medicines/${product.slug}`} className="product-visual">
      <span className={product.prescriptionRequired?'rx-badge':'otc-badge'}>{product.prescriptionRequired?'Rx required':'OTC'}</span>
      <span className="cross">+</span>
    </Link>
    <div className="product-body">
      <div className="small muted">{product.manufacturer}</div>
      <Link href={`/medicines/${product.slug}`}><h3>{product.name}</h3></Link>
      <div className="small muted">{product.composition ?? product.packSize}</div>
      <div className="price-row"><span className="price">{formatInr(product.pricePaise)}</span><span className="mrp">{formatInr(product.mrpPaise)}</span></div>
      <AddToCartButton productId={product.id} compact />
    </div>
  </article>;
}
