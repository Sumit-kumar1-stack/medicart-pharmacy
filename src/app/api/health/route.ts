import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureRedis } from '@/lib/redis';
export async function GET(){const health:{status:'ok'|'degraded';database:'ok'|'error';redis:'ok'|'error';timestamp:string}={status:'ok',database:'ok',redis:'ok',timestamp:new Date().toISOString()};try{await prisma.$queryRaw`SELECT 1`}catch(error){console.error(error);health.database='error';health.status='degraded'}try{const r=await ensureRedis();await r.ping()}catch(error){console.error(error);health.redis='error';health.status='degraded'}return NextResponse.json(health,{status:health.status==='ok'?200:503})}
