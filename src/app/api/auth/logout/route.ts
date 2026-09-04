import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { assertSameOrigin, jsonError } from '@/lib/http';
export async function POST(req:NextRequest){try{assertSameOrigin(req);await destroySession();return NextResponse.json({ok:true})}catch(e){return jsonError(e)}}
