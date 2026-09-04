import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CartClient } from '@/components/CartClient';
export default async function CartPage(){const user=await currentUser();if(!user)redirect('/login?next=/cart');const [items,prescriptions]=await Promise.all([prisma.cartItem.findMany({where:{userId:user.id},include:{product:true},orderBy:{createdAt:'asc'}}),prisma.prescription.findMany({where:{userId:user.id,status:'APPROVED'},include:{items:true},orderBy:{reviewedAt:'desc'}})]);return <main className="container"><div className="page-head"><span className="eyebrow">Cart</span><h1 style={{fontSize:42}}>Your order</h1><p className="muted">Rx products require a prescription explicitly approved for the matching product.</p></div><CartClient initialItems={items} prescriptions={prescriptions.map(p=>({...p,reviewedAt:p.reviewedAt?.toISOString()??null}))}/></main>}
