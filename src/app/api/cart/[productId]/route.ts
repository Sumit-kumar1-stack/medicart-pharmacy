import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin, jsonError, AppError } from '@/lib/http';

const schema=z.object({quantity:z.number().int().min(1).max(20)});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{productId:string}>}){try{assertSameOrigin(req);const user=await requireUser();const {productId}=await params;const {quantity}=schema.parse(await req.json());const existing=await prisma.cartItem.findUnique({where:{userId_productId:{userId:user.id,productId}},include:{product:true}});if(!existing)throw new AppError(404,'CART_ITEM_NOT_FOUND','Cart item not found');const stock=await prisma.inventoryBatch.aggregate({where:{productId,status:'ACTIVE',expiresAt:{gt:new Date()}},_sum:{quantityAvailable:true}});if((stock._sum.quantityAvailable??0)<quantity)throw new AppError(409,'OUT_OF_STOCK','Not enough eligible stock');const item=await prisma.cartItem.update({where:{id:existing.id},data:{quantity},include:{product:true}});return NextResponse.json({item})}catch(e){return jsonError(e)}}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{productId:string}>}){try{assertSameOrigin(req);const user=await requireUser();const {productId}=await params;await prisma.cartItem.deleteMany({where:{userId:user.id,productId}});return NextResponse.json({ok:true})}catch(e){return jsonError(e)}}
