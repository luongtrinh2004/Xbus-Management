import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGalleryQueue } from "@/libs/galleryQueue";
export const runtime = "nodejs";
export async function GET(req,{params}) { const token=await getToken({req,secret:process.env.NEXTAUTH_SECRET}); if(!token?.id)return NextResponse.json({error:"Chưa xác thực"},{status:401}); const job=await getGalleryQueue().getJob((await params).id); if(!job||job.data.ownerId!==token.id)return NextResponse.json({error:"Không tìm thấy job"},{status:404}); const state=await job.getState(); return NextResponse.json({id:job.id,state,progress:job.progress,result:job.returnvalue,error:job.failedReason}); }
