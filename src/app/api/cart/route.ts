import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, jsonError } from '@/lib/http';

const addSchema=z.object({productId:z.string().min(1),quantity:z.number().int().min(1).max(20).default(1)});

export async function GET(){
  try{
    const user=await requireUser();
    const [items,prescriptions]=await Promise.all([
      prisma.cartItem.findMany({where:{userId:user.id},include:{product:true},orderBy:{createdAt:'asc'}}),
      prisma.prescription.findMany({where:{userId:user.id,status:'APPROVED'},include:{items:true},orderBy:{reviewedAt:'desc'}})
    ]);
    return NextResponse.json({items,prescriptions});
  }catch(e){return jsonError(e)}
}

export async function POST(req:NextRequest){
  try{
    assertSameOrigin(req); const user=await requireUser(); const data=addSchema.parse(await req.json());
    const product=await prisma.product.findUnique({where:{id:data.productId}});
    if(!product||!product.active) throw new AppError(404,'PRODUCT_NOT_FOUND','Product is unavailable');
    const stock=await prisma.inventoryBatch.aggregate({where:{productId:product.id,status:'ACTIVE',expiresAt:{gt:new Date()},quantityAvailable:{gt:0}},_sum:{quantityAvailable:true}});
    if((stock._sum.quantityAvailable??0)<data.quantity) throw new AppError(409,'OUT_OF_STOCK','Not enough eligible stock');
    const item=await prisma.cartItem.upsert({where:{userId_productId:{userId:user.id,productId:product.id}},create:{userId:user.id,productId:product.id,quantity:data.quantity},update:{quantity:{increment:data.quantity}},include:{product:true}});
    if(item.quantity>20){await prisma.cartItem.update({where:{id:item.id},data:{quantity:20}});throw new AppError(400,'MAX_QUANTITY','Maximum cart quantity is 20 per product');}
    return NextResponse.json({item},{status:201});
  }catch(e){return jsonError(e)}
}
