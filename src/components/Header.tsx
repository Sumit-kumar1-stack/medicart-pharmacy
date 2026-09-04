import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SearchBox } from './SearchBox';

export async function Header() {
  const user = await currentUser();
  const cartCount = user ? await prisma.cartItem.aggregate({ where:{ userId:user.id }, _sum:{ quantity:true } }) : null;
  return <header className="header"><div className="container header-row">
    <Link className="logo" href="/"><span className="logo-mark">+</span>MediCart</Link>
    <SearchBox />
    <nav className="nav" aria-label="Primary navigation">
      <Link className="hide-mobile" href="/prescriptions">Prescription</Link>
      <Link href="/cart">Cart ({cartCount?._sum.quantity ?? 0})</Link>
      {user ? <><Link href="/orders">{user.name.split(' ')[0]}</Link>{user.role !== 'CUSTOMER' && <Link href="/admin">Admin</Link>}</> : <Link href="/login">Sign in</Link>}
    </nav>
  </div></header>;
}
