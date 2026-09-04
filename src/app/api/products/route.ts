import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET(req:NextRequest){const q=req.nextUrl.searchParams.get('q')?.trim()??'';const products=await prisma.product.findMany({where:{active:true,...(q?{OR:[{name:{contains:q,mode:'insensitive'}},{genericName:{contains:q,mode:'insensitive'}},{brandName:{contains:q,mode:'insensitive'}},{composition:{contains:q,mode:'insensitive'}}]}:{})},take:30,orderBy:{name:'asc'}});return NextResponse.json({products})}
