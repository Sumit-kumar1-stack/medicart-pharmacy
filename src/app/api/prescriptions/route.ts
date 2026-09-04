import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppError, assertSameOrigin, jsonError } from '@/lib/http';
import { putPrivateObject } from '@/lib/storage';
import { audit } from '@/lib/audit';

const allowed=new Set(['image/jpeg','image/png','application/pdf']);
function hasExpectedMagic(type:string,b:Uint8Array){if(type==='application/pdf')return b[0]===0x25&&b[1]===0x50&&b[2]===0x44&&b[3]===0x46;if(type==='image/png')return b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47;if(type==='image/jpeg')return b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;return false;}
export async function GET(){try{const user=await requireUser();const prescriptions=await prisma.prescription.findMany({where:{userId:user.id},include:{items:true},orderBy:{createdAt:'desc'}});return NextResponse.json({prescriptions})}catch(e){return jsonError(e)}}
export async function POST(req:NextRequest){try{assertSameOrigin(req);const user=await requireUser();const form=await req.formData();const file=form.get('file');if(!(file instanceof File))throw new AppError(400,'FILE_REQUIRED','Select a prescription file');if(!allowed.has(file.type))throw new AppError(415,'UNSUPPORTED_FILE','Only JPG, PNG and PDF files are accepted');if(file.size<16||file.size>8*1024*1024)throw new AppError(413,'INVALID_FILE_SIZE','Prescription must be between 16 bytes and 8 MB');const bytes=new Uint8Array(await file.arrayBuffer());if(!hasExpectedMagic(file.type,bytes))throw new AppError(415,'FILE_SIGNATURE_MISMATCH','File content does not match its declared type');const ext=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg';const key=`prescriptions/${user.id}/${randomUUID()}.${ext}`;await putPrivateObject(key,bytes,file.type);const rx=await prisma.prescription.create({data:{userId:user.id,fileKey:key,originalFileName:file.name.slice(0,160),mimeType:file.type,status:'UPLOADED'}});await audit({actorId:user.id,action:'PRESCRIPTION_UPLOADED',resourceType:'Prescription',resourceId:rx.id,metadata:{mimeType:file.type,size:file.size}});return NextResponse.json({prescription:{id:rx.id,status:rx.status}},{status:201})}catch(e){return jsonError(e)}}
