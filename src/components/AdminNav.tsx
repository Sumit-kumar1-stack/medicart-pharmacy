import Link from 'next/link';
export function AdminNav(){return <nav className="admin-nav" aria-label="Admin navigation"><Link href="/admin">Overview</Link><Link href="/admin/prescriptions">Prescriptions</Link><Link href="/admin/orders">Orders</Link><Link href="/admin/inventory">Inventory</Link><Link href="/">Storefront</Link></nav>}
