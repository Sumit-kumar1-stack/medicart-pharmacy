import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin, jsonError, AppError } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createSession, verifyPassword } from '@/lib/auth';

const input=z.object({email:z.string().email().transform(x=>x.toLowerCase()),password:z.string().min(1).max(128)});
export async function POST(req:NextRequest){try{assertSameOrigin(req);const data=input.parse(await req.json());const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';await enforceRateLimit(`login:${ip}:${data.email}`,8,15*60);const user=await prisma.user.findUnique({where:{email:data.email}});if(!user||!user.active||!(await verifyPassword(data.password,user.passwordHash)))throw new AppError(401,'INVALID_CREDENTIALS','Email or password is incorrect');await createSession(user.id);return NextResponse.json({ok:true,user:{id:user.id,name:user.name,email:user.email,role:user.role}});}catch(e){return jsonError(e)}}
