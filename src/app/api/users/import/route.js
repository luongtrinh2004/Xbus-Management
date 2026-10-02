import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { appendAuditLog, getTypes, importStaffProfiles } from "@/libs/dataRepository";

export async function POST(req) {
  const token = await getToken({req, secret:process.env.NEXTAUTH_SECRET});
  if (!token?.id || token.role !== "admin" || token.status === "disabled") return NextResponse.json({error:"Chỉ quản trị viên đang hoạt động được import nhân sự"},{status:403});
  try {
    const {rows} = await req.json();
    const {updated,skipped,unchanged} = await importStaffProfiles(rows, await getTypes());
    let auditWarning = false;
    try {
      await appendAuditLog({adminId:token.id,adminName:token.name||"Admin",adminEmail:token.email||"",action:"IMPORT_USERS",targetType:"USER",details:`Import nhân sự: cập nhật ${updated}, không đổi ${unchanged}, bỏ qua ${skipped} dòng không khớp mã`});
    } catch(error) { auditWarning=true; console.error("[Import audit]",error); }
    return NextResponse.json({updated,skipped,unchanged,auditWarning});
  } catch(error) {
    console.error("[API User Import]",error);
    return NextResponse.json({error:error.code ? "Không thể lưu dữ liệu. Toàn bộ lượt import đã được hủy." : error.message || "File không hợp lệ"},{status:400});
  }
}
