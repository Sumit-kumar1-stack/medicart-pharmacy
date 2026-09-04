import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
export async function GET(){const user=await currentUser();return NextResponse.json({user:user?{id:user.id,name:user.name,email:user.email,role:user.role}:null})}
