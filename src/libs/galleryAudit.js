import { appendAuditLog } from "@/libs/dataRepository";
import { actionLabel } from "@/libs/auditLabels";

export async function auditGallery(token, action, item, detail = "") {
  return appendAuditLog({
    adminId: token.id,
    adminName: token.name || "Nhân sự",
    adminEmail: token.email || "",
    action,
    targetType: "GALLERY",
    targetId: item?.postId || item?.id || "",
    details: `${actionLabel(action)}: ${item?.title || item?.fileName || "Bài viết không có tiêu đề"}${detail ? ` — ${detail}` : ""}`,
  });
}
