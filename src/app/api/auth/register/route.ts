import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin, jsonError, AppError } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createSession, hashPassword } from '@/lib/auth';

const input=z.object({name:z.string().trim().min(2).max(80),email:z.string().email().transform(x=>x.toLowerCase()),password:z.string().min(10).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/)});
export async function POST(req:NextRequest){try{assertSameOrigin(req);const data=input.parse(await req.json());const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';await enforceRateLimit(`register:${ip}`,5,60*60);const exists=await prisma.user.findUnique({where:{email:data.email}});if(exists)throw new AppError(409,'EMAIL_EXISTS','An account already exists for this email');const user=await prisma.user.create({data:{name:data.name,email:data.email,passwordHash:await hashPassword(data.password)}});await createSession(user.id);return NextResponse.json({ok:true,user:{id:user.id,name:user.name,email:user.email}});}catch(e){return jsonError(e)}}
