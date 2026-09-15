import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  formatVietnamDate,
  formatVietnamDateTime,
  toVietnamDateKey,
} from "./dateTime";

/**
 * Tạo một container ẩn để render HTML chuẩn cho việc chụp ảnh PDF
 */
function createPrintContainer(htmlContent) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.width = "794px"; // Chuẩn khổ rộng A4 ở 96 DPI
  container.style.backgroundColor = "#ffffff";
  container.style.padding = "32px 40px";
  container.style.boxSizing = "border-box";
  container.style.fontFamily =
    '"Public Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  container.style.color = "#2f3349";
  container.style.zIndex = "-1000";
  container.innerHTML = htmlContent;
  document.body.appendChild(container);
  return container;
}

/**
 * Chuyển đổi DOM container thành PDF và tự động tải về trình duyệt
 */
async function renderElementToPdf(container, fileName) {
  try {
    const canvas = await html2canvas(container, {
      scale: 2, // Tăng độ sắc nét
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error("[teaPdfHelper] Lỗi khi tạo PDF:", error);
    throw error;
  } finally {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Định dạng ngày giờ thân thiện tiếng Việt
 */
function formatDateTime(isoString) {
  return formatVietnamDateTime(isoString || new Date());
}

/**
 * Tải file PDF danh sách đặt món cho MỘT quán cụ thể
 * Chỉ liệt kê những người ĐÃ ĐẶT MÓN của quán đó + Bảng tổng hợp số lượng món
 */
export async function downloadShopOrdersPdf({
  invitation,
  shopName,
  orders = [],
  users = [],
}) {
  const shopOrders = orders.filter((o) => {
    if (!o.drink || !o.drink.trim()) return false;
    const orderShop = (o.shop || "").trim().toLowerCase();
    const targetShop = (shopName || "").trim().toLowerCase();
    if (targetShop === "chưa chọn quán" || !targetShop) {
      return !orderShop || orderShop === "chưa chọn quán";
    }
    return orderShop === targetShop;
  });

  const exportedText = formatDateTime(new Date().toISOString());
  const safeShopFile = (shopName || "Quan")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const dateStr = toVietnamDateKey(invitation?.scheduledAt || Date.now());
  const fileName = `Tra_Chieu_${safeShopFile}_${dateStr}.pdf`;

  const rowsHtml = shopOrders.length
    ? shopOrders
        .map((order, idx) => {
          const user = users.find((u) => u.id === order.userId) || {};
          const userName = user.name || "Nhân viên";
          return `
            <tr>
              <td style="text-align: center; width: 45px; border: 1px solid #dcdfe6; padding: 9px 8px;">${idx + 1}</td>
              <td style="font-weight: 500; border: 1px solid #dcdfe6; padding: 9px 12px;">${userName}</td>
              <td style="font-weight: 600; color: #7367f0; border: 1px solid #dcdfe6; padding: 9px 12px;">${order.drink}</td>
              <td style="text-align: center; width: 65px; border: 1px solid #dcdfe6; padding: 9px 8px;">${order.size || "Mặc định"}</td>
              <td style="color: #606266; border: 1px solid #dcdfe6; padding: 9px 12px;">${order.note || "—"}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="5" style="text-align:center; padding: 24px; color: #909399;">Không có đơn đặt món nào cho quán này.</td></tr>`;

  const html = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <!-- Header -->
      <div style="border-bottom: 2px solid #7367f0; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <img src="/images/logos/logo-light.svg" alt="Xbus" style="width: 185px; height: auto; display: block; margin-bottom: 8px;" />
          <h1 style="margin: 6px 0 0 0; font-size: 22px; color: #2f3349; font-weight: 700;">
            ĐƠN ĐẶT TRÀ CHIỀU
          </h1>
        </div>
        <div style="text-align: right; font-size: 13px; color: #606266;">
          <div>Thời gian: <strong>${exportedText}</strong></div>
          <div style="margin-top: 4px;">Tổng số món: <strong style="color: #7367f0; font-size: 15px;">${shopOrders.length}</strong></div>
        </div>
      </div>

      <!-- Shop Info Badge -->
      <div style="background-color: #f3f1ff; border-left: 4px solid #7367f0; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 13px; color: #606266; text-transform: uppercase; font-weight: 600;">Tên quán:</span>
          <span style="font-size: 18px; font-weight: 700; color: #7367f0; margin-left: 8px;">${shopName || "Chưa chọn quán"}</span>
        </div>
        <div style="font-size: 13px; color: #606266;">
          Số người đặt: <strong>${shopOrders.length} người</strong>
        </div>
      </div>

      <!-- Detail Table -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 15px; margin: 0 0 10px 0; color: #2f3349; font-weight: 600;">
          1. Danh sách đặt nước:
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8f7fa; color: #2f3349;">
              <th style="border: 1px solid #dcdfe6; padding: 10px 8px; text-align: center; font-weight: 600;">STT</th>
              <th style="border: 1px solid #dcdfe6; padding: 10px 12px; text-align: left; font-weight: 600;">Nhân sự</th>
              <th style="border: 1px solid #dcdfe6; padding: 10px 12px; text-align: left; font-weight: 600;">Món đã chọn</th>
              <th style="border: 1px solid #dcdfe6; padding: 10px 8px; text-align: center; font-weight: 600;">Size</th>
              <th style="border: 1px solid #dcdfe6; padding: 10px 12px; text-align: left; font-weight: 600;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Footer Note -->
      <div style="margin-top: 32px; padding-top: 14px; border-top: 1px dashed #dcdfe6; font-size: 12px; color: #909399; display: flex; justify-content: space-between;">
        <span>Xbus Management System</span>
        <span>Xuất tự động ngày ${formatVietnamDate(new Date())}</span>
      </div>
    </div>
  `;

  const container = createPrintContainer(html);
  return renderElementToPdf(container, fileName);
}

/**
 * Tải danh sách tất cả các quán (mỗi quán 1 file riêng tự động tải lần lượt)
 */
export async function downloadAllShopsPdf({
  invitation,
  orders = [],
  users = [],
}) {
  const shopSet = new Set();
  orders.forEach((o) => {
    if (o.drink && o.drink.trim()) {
      shopSet.add(o.shop?.trim() || "Chưa chọn quán");
    }
  });

  const shops = Array.from(shopSet);
  if (shops.length === 0) {
    throw new Error("Chưa có nhân sự nào đặt món để xuất PDF");
  }

  for (let i = 0; i < shops.length; i++) {
    const shop = shops[i];
    await downloadShopOrdersPdf({
      invitation,
      shopName: shop,
      orders,
      users,
    });
    // Giãn cách một chút giữa các lần tải file để trình duyệt không chặn pop-up
    if (i < shops.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
}

/**
 * Tải file PDF danh sách Món ăn kèm trà chiều (Hoa quả, Đồ chiên rán, Khác)
 */
export async function downloadFoodItemsPdf({ invitation, foodItems = [] }) {
  const scheduledText = formatDateTime(invitation?.scheduledAt);
  const dateStr = toVietnamDateKey(invitation?.scheduledAt || Date.now());
  const fileName = `Mon_An_Tra_Chieu_${dateStr}.pdf`;

  const categoryColorMap = {
    "Hoa quả": "#28c76f",
    "Đồ chiên rán": "#ff9f43",
    Khác: "#00bad1",
  };

  const rowsHtml = foodItems.length
    ? foodItems
        .map((item, idx) => {
          const color = categoryColorMap[item.category] || "#7367f0";
          return `
            <tr>
              <td style="text-align: center; width: 45px; border: 1px solid #dcdfe6; padding: 9px 8px;">${idx + 1}</td>
              <td style="font-weight: 600; color: #2f3349; border: 1px solid #dcdfe6; padding: 9px 12px;">${item.name}</td>
              <td style="text-align: center; border: 1px solid #dcdfe6; padding: 9px 10px;">
                <span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: ${color}; background-color: ${color}1a;">
                  ${item.category}
                </span>
              </td>
              <td style="text-align: center; font-weight: 700; color: #7367f0; border: 1px solid #dcdfe6; padding: 9px 12px; font-size: 14px;">
                ${item.quantity} ${item.unit || "phần"}
              </td>
              <td style="color: #606266; border: 1px solid #dcdfe6; padding: 9px 12px;">${item.note || "—"}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="5" style="text-align:center; padding: 24px; color: #909399;">Chưa có món ăn kèm nào được thêm.</td></tr>`;

  // Thống kê theo phân loại
  const summaryByCategory = {};
  foodItems.forEach((item) => {
    const cat = item.category || "Khác";
    if (!summaryByCategory[cat]) {
      summaryByCategory[cat] = [];
    }
    summaryByCategory[cat].push(`${item.quantity} ${item.unit} ${item.name}`);
  });

  const summaryHtml = Object.entries(summaryByCategory)
    .map(([cat, list]) => {
      const color = categoryColorMap[cat] || "#7367f0";
      return `
        <div style="margin-bottom: 12px; padding: 10px 14px; background-color: #f8f7fa; border-left: 3px solid ${color}; border-radius: 4px;">
          <div style="font-weight: 700; color: ${color}; font-size: 13px; text-transform: uppercase;">
            ${cat} (${list.length} món):
          </div>
          <div style="font-size: 13px; color: #2f3349; margin-top: 4px; line-height: 1.5;">
            ${list.join(" • ")}
          </div>
        </div>
      `;
    })
    .join("");

  const html = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <!-- Header -->
      <div style="border-bottom: 2px solid #ff9f43; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 13px; font-weight: 700; color: #ff9f43; letter-spacing: 1.5px; text-transform: uppercase;">
            PHENIKAA-X • XBUS MANAGEMENT
          </div>
          <h1 style="margin: 6px 0 0 0; font-size: 22px; color: #2f3349; font-weight: 700;">
            DANH SÁCH MÓN ĂN KÈM TRÀ CHIỀU
          </h1>
        </div>
        <div style="text-align: right; font-size: 13px; color: #606266;">
          <div>Thời gian: <strong>${scheduledText}</strong></div>
          <div style="margin-top: 4px;">Tổng số loại món: <strong style="color: #ff9f43; font-size: 15px;">${foodItems.length}</strong></div>
        </div>
      </div>

      <!-- Banner note -->
      <div style="background-color: #fff9f0; border-left: 4px solid #ff9f43; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
        <span style="font-size: 13px; color: #874d00; font-weight: 600;">
          Danh sách món ăn được chuẩn bị kèm buổi trà chiều (Hoa quả, Đồ chiên rán, Khác).
        </span>
      </div>

      <!-- Detail Table -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 15px; margin: 0 0 10px 0; color: #2f3349; font-weight: 600;">
          Chi tiết danh sách món ăn
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8f7fa; color: #2f3349;">
              <th style="border: 1px solid #dcdfe6; padding: 10px 8px; text-align: center; font-weight: 600;">STT</th>
              <th style="border: 1px solid #dcdfe6; padding: 10px 12px; text-align: left; font-weight: 600;">Tên món ăn</th>
              <th style="border: 1px solid #dcdfe6; padding: 10px 10px; text-align: center; font-weight: 600;">Phân loại</th>
              <th style="border: 1px solid #dcdfe6; padding: 10px 12px; text-align: center; font-weight: 600;">Số lượng & Đơn vị</th>
              <th style="border: 1px solid #dcdfe6; padding: 10px 12px; text-align: left; font-weight: 600;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Summary by Category -->
      ${
        foodItems.length > 0
          ? `
      <div style="margin-top: 24px;">
        <h3 style="font-size: 15px; margin: 0 0 10px 0; color: #2f3349; font-weight: 600;">
          Tóm tắt theo phân loại
        </h3>
        ${summaryHtml}
      </div>
      `
          : ""
      }

      <!-- Footer Note -->
      <div style="margin-top: 32px; padding-top: 14px; border-top: 1px dashed #dcdfe6; font-size: 12px; color: #909399; display: flex; justify-content: space-between;">
        <span>Xbus Management System</span>
        <span>Xuất tự động ngày ${formatVietnamDate(new Date())}</span>
      </div>
    </div>
  `;

  const container = createPrintContainer(html);
  return renderElementToPdf(container, fileName);
}
