import { overtimeContext, overtimeFailure } from "@/libs/overtimeApi";
import { readOvertime } from "@/libs/overtimeRepository";
import {
  overtimeView,
  parseOtFilters,
  OT_STATUSES,
  OT_TYPES,
  localDate,
} from "@/libs/overtime";
import * as XLSX from "xlsx";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req) {
  try {
    const { users, actor } = await overtimeContext(req);
    const filters = parseOtFilters(new URL(req.url).searchParams);
    const view = overtimeView(await readOvertime(), actor, users, filters);
    const workbook = XLSX.utils.book_new();
    const rows = view.entries.map((item) => ({
      "Nhân viên": item.userName,
      "Ngày OT": localDate(item.startTime),
      "Loại OT": OT_TYPES[item.otType],
      "Bắt đầu": new Date(item.startTime).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      "Kết thúc": new Date(item.endTime).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      "Phút đăng ký": item.registeredMinutes,
      "Phút nghỉ": item.breakMinutes,
      "Phút thực tế": item.actualMinutes ?? "",
      "Phút xác nhận": item.confirmedMinutes ?? "",
      "Phút đăng ký trong kỳ": item.periodRegisteredMinutes,
      "Phút xác nhận trong kỳ": item.periodConfirmedMinutes,
      "Trạng thái": OT_STATUSES[item.status],
      "Lý do": item.reason,
      "Báo cáo": item.workReport,
      "Ghi chú": item.reportNote,
      "Lý do từ chối": item.rejectionReason,
      "Người duyệt": item.approvedByName,
      "Người xác nhận": item.confirmedByName,
      "Ngày tạo": item.createdAt,
    }));
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        rows.length
          ? rows
          : [{ "Thông tin": "Không có đơn OT phù hợp bộ lọc" }],
      ),
      "Danh sách OT",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        view.employees.map((item) => ({
          "Nhân viên": item.name,
          "Giờ đăng ký": item.registeredMinutes / 60,
          "Giờ xác nhận": item.confirmedMinutes / 60,
          "Đơn hoàn thành": item.completed,
        })),
      ),
      "Tổng hợp nhân viên",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        view.months.map((item) => ({
          Tháng: item.month,
          "Giờ đăng ký": item.registeredMinutes / 60,
          "Giờ xác nhận": item.confirmedMinutes / 60,
        })),
      ),
      "Tổng hợp tháng",
    );
    return new Response(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
      {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="overtime-${filters.year}${filters.month ? `-${filters.month}` : ""}.xlsx"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return overtimeFailure(error);
  }
}
