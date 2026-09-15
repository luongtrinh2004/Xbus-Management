# Nghiệp Vụ Deadline Và Nhắc Đóng Quỹ

Áp dụng cho thẻ **Danh sách đóng quỹ** tại `/fund?section=members`.

## 1. Mục tiêu

- Quản lý hạn đóng quỹ theo từng kỳ.
- Nhắc qua email những nhân sự chưa đóng trước hạn.
- Cho phép Admin/Trợ lý chủ động gửi nhắc ngay khi cần.
- Không gửi trùng một người trong cùng một mốc nhắc.

## 2. Phân quyền

| Chức năng | Admin | Trợ lý | Nhân sự |
| --- | :---: | :---: | :---: |
| Xem deadline và trạng thái nhắc | ✓ | ✓ | ✓ |
| Thiết lập deadline/lịch nhắc | ✓ | ✓ | — |
| Gửi nhắc ngay | ✓ | ✓ | — |
| Nhận email nhắc khi chưa đóng | ✓ | ✓ | ✓ |

## 3. UI tối giản

### 3.1. Vị trí hiển thị

- Trong header của thẻ **Danh sách đóng quỹ**.
- Bên trái badge `10/29 đã đóng` hiển thị deadline theo dạng: `Hạn đóng: 22/09/2026`.
- Nếu chưa cấu hình deadline: hiển thị `Chưa đặt hạn đóng` với màu secondary.

### 3.2. Thiết lập

- Chỉ Admin/Trợ lý thấy icon `tabler-settings` cạnh badge deadline.
- Click icon mở modal nhỏ **Thiết lập nhắc đóng quỹ** gồm:
  - `Hạn đóng quỹ`: input ngày.
  - `Nhắc trước hạn`: chọn nhiều mốc ngày, mặc định `2 ngày` và `1 ngày`.
  - Toggle `Bật gửi email tự động`.
- Nút footer: `Hủy` (tonal secondary), `Lưu thay đổi` (contained primary).

### 3.3. Gửi nhắc thủ công

- Ở hàng thao tác của mỗi nhân sự có trạng thái **Chưa đóng**, hiển thị icon chuông `tabler-bell`.
- Icon chỉ Admin/Trợ lý nhìn thấy và có tooltip `Gửi email nhắc đóng quỹ`.
- Click icon gửi email ngay cho đúng nhân sự đó, có toast xác nhận.
- Nếu nhân sự đã đóng thì không hiện icon chuông.
- Khi gửi thành công, icon chuyển trạng thái disabled trong ngày hiện tại và tooltip hiển thị thời điểm gửi gần nhất.

## 4. Quy tắc gửi email

- Chỉ gửi đến nhân sự `status = able`, có email hợp lệ và chưa đóng ở kỳ quỹ đó.
- Mail tự động chạy mỗi ngày lúc `08:00` theo múi giờ `Asia/Ho_Chi_Minh`.
- Với deadline ngày 22 và mốc 2, 1 ngày, hệ thống gửi vào ngày 20 và 21.
- Không gửi tự động sau deadline.
- Email thủ công không bị giới hạn bởi lịch tự động, nhưng cùng một người chỉ gửi tối đa một lần trong 24 giờ, trừ khi Admin/Trợ lý xác nhận gửi lại.
- Không gửi chung BCC: mỗi người nhận một email cá nhân hóa.
- Nội dung bắt buộc gồm kỳ quỹ, số tiền tối thiểu theo hình thức nhân sự, deadline và link `/fund?section=members`.

## 5. Dữ liệu

Mỗi kỳ quỹ bổ sung cấu hình:

```json
{
  "paymentDeadline": "2026-09-22",
  "reminderDaysBefore": [2, 1],
  "emailReminderEnabled": true,
  "reminderLogs": [
    {
      "userId": "usr_001",
      "sentAt": "2026-09-20T01:00:00.000Z",
      "trigger": "automatic",
      "deadline": "2026-09-22"
    }
  ]
}
```

- `reminderLogs` là nguồn kiểm tra chống gửi trùng và dùng để hiển thị lần gửi gần nhất.
- Không lưu mật khẩu SMTP hoặc App Password trong JSON/Git.

## 6. Kiến trúc kỹ thuật tối giản

- Dùng một API nội bộ `POST /api/jobs/fund-reminders`, được bảo vệ bằng `FUND_REMINDER_SECRET`.
- Cron trên VPS gọi API theo lịch mỗi ngày; không chạy cron bên trong Next.js request hoặc browser.
- Gửi mail bằng SMTP của Google Workspace/Gmail thông qua `nodemailer` và App Password.
- Dùng `src/data/json/funds.json` để lưu cấu hình kỳ quỹ và log gửi; phù hợp hệ thống một container hiện tại.
- Cron phải chạy trên host hoặc container scheduler chuyên biệt, sử dụng cùng timezone `Asia/Ho_Chi_Minh`.
- Tất cả lần gửi, lỗi gửi và thao tác gửi tay được ghi Audit Log.

## 7. Biến môi trường

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=troly@phenikaa-x.com
SMTP_APP_PASSWORD=
FUND_REMINDER_SECRET=
```

Thiếu một trong các biến SMTP thì UI vẫn cho phép cấu hình deadline, nhưng thao tác gửi mail phải báo rõ `Email nhắc chưa được cấu hình`.
