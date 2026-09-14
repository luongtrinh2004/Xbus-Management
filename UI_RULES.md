# XBUS MANAGEMENT - UI & DESIGN SYSTEM RULES

Tài liệu quy định toàn bộ chuẩn mực giao diện, hệ màu, typography, bố cục và quy tắc phân quyền (Role-based UI) áp dụng cho hệ thống **Xbus Management**.

---

## 1. Màu Sắc Chủ Đạo (Color System & Tokens)

Hệ thống sử dụng bộ màu chuẩn Materio MUI với tông màu chính tím hiện đại (Violet / Indigo) kết hợp cùng hệ thống màu ngữ nghĩa (Semantic Colors):

### 1.1. Bảng Màu Ngữ Nghĩa (Semantic Palette)

| Vai trò | Tên Token | Mã màu Hex | Light / Dark Opacity | Ứng dụng thực tế |
| :--- | :--- | :--- | :--- | :--- |
| **Primary (Chính)** | `primary.main` | `#7367F0` | `#8F85F3` / `#675DD8` | Nút bấm chính, sidebar active, link, icon thương hiệu |
| **Secondary** | `secondary.main`| `#808390` | `#999CA6` / `#737682` | Nút phụ, text phụ, trạng thái trung tính |
| **Success** | `success.main` | `#28C76F` | `#53D28C` / `#24B364` | Trạng thái "Đang hoạt động", "Đã đóng quỹ", "Hoàn thành", số dư dương |
| **Error** | `error.main` | `#FF4C51` | `#FF7074` / `#E64449` | Trạng thái "Vô hiệu hóa", "Đã hủy", xóa, số dư âm cảnh báo |
| **Warning** | `warning.main` | `#FF9F43` | `#FFB269` / `#E68F3C` | Trạng thái "Chờ duyệt", cảnh báo chênh lệch điểm, nhắc nhở |
| **Info** | `info.main` | `#00BAD1` | `#33C8DA` / `#00A7BC` | Trạng thái "Sắp tới", thông tin hướng dẫn, badge thông báo |

### 1.2. Biến Thể Nền & Opacity (Soft Colors)
- Để tạo cảm giác nhẹ nhàng, hiện đại, các Badge và Chip trạng thái không dùng nền đậm đặc mà sử dụng biến thể **light opacity (12% - 16%)**:
  - `Chip` xanh: background `rgba(40, 199, 111, 0.12)`, text `#28C76F`.
  - `Chip` đỏ: background `rgba(255, 76, 81, 0.12)`, text `#FF4C51`.
  - `Chip` tím: background `rgba(115, 103, 240, 0.12)`, text `#7367F0`.
  - `Chip` cam: background `rgba(255, 159, 67, 0.12)`, text `#FF9F43`.

### 1.3. Nền (Background) & Đường Viền (Borders)
- **Light Mode**:
  - Paper / Card: `#FFFFFF`
  - Body Background: `#F8F7FA`
  - Border: `rgba(47, 43, 61, 0.12)`
- **Dark Mode**:
  - Paper / Card: `#2F3349`
  - Body Background: `#25293C`
  - Border: `rgba(225, 222, 245, 0.12)`

---

## 2. Typography & Font Chữ

- **Font Family**: `"Public Sans", sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
- **Quy tắc cỡ chữ & độ đậm (Font Scale)**:

| Phân cấp | Cỡ chữ (Rem/Px) | Font Weight | Line Height | Trường hợp sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | `2.875rem` (46px) | 500 | 1.48 | Tiêu đề trang landing |
| **H3** | `1.75rem` (28px) | 500 | 1.50 | Tiêu đề phân hệ lớn |
| **H4** | `1.5rem` (24px) | 500 | 1.58 | Tiêu đề màn hình chính (Dashboard, Nhân sự...) |
| **H5** | `1.125rem` (18px) | 500 | 1.55 | Tiêu đề Card, tiêu đề Modal/Dialog |
| **H6** | `0.9375rem` (15px) | 500 | 1.47 | Tiêu đề mục con, Header bảng |
| **Body1** | `0.9375rem` (15px) | 400 | 1.47 | Nội dung văn bản chính, dữ liệu ô bảng |
| **Body2** | `0.8125rem` (13px) | 400 | 1.54 | Văn bản phụ, chú thích nhỏ, email phụ |
| **Button** | `0.9375rem` (15px) | 500 | 1.47 | Chữ nút bấm (chữ thường hoặc Capitalize, không ALL CAPS thô cứng) |
| **Caption** | `0.8125rem` (13px) | 400 | 1.38 | Gợi ý dưới input, timestamp |

---

## 3. Quy Tắc Component (Component Standards)

### 3.1. Ô Nhập Liệu (Input Fields)
- Luôn ưu tiên dùng `@core/components/mui/TextField` (`CustomTextField`).
- Kích thước chuẩn: `size="small"` cho các bảng lọc và form trong card.
- Định dạng số tiền: Tự động format dấu chấm phân cách hàng nghìn (ví dụ `100.000`) và tách nhãn đơn vị `VNĐ`.

### 3.2. Bảng Dữ Liệu (Data Tables)
- Dùng `@tanstack/react-table` v8 kết hợp `@core/styles/table.module.css`.
- Header bảng: Background nhạt, chữ in hoa nhẹ hoặc hoa đầu từ, canh lề thẳng với dữ liệu (cột chữ canh trái, cột số/tiền canh phải, trạng thái canh giữa).
- Phân trang: Sử dụng `@components/TablePaginationComponent`.
- Hiệu ứng dòng: `hover` nhẹ (`rgba(115, 103, 240, 0.04)`).

### 3.3. Nút Bấm (Buttons)
- **Thao tác chính (Primary Action)**: `variant="contained" color="primary"` (vd: Lưu thay đổi, Thêm nhân sự, Random lịch).
- **Thao tác phụ (Secondary Action)**: `variant="tonal"` hoặc `variant="outlined"` (vd: Đóng, Hủy bỏ, Xuất Excel).
- **Thao tác xóa / Nguy hiểm**: `variant="tonal" color="error"` hoặc `variant="contained" color="error"` kèm Dialog xác nhận (Confirmation Modal).

### 3.4. Avatar & Icon
- **Avatar**: Sử dụng `@core/components/mui/Avatar` (`CustomAvatar`) với màu nền tương ứng theo vai trò hoặc bộ phận.
- **Icon Set**: Sử dụng chuẩn **Tabler Icons** (`tabler-*` như `tabler-users`, `tabler-droplet`, `tabler-wallet`, `tabler-package`, `tabler-history`, `tabler-file-spreadsheet`).

---

## 4. Bố Cục & Điều Hướng (Layout & Sidebar Navigation)

### 4.1. Khung Điều Hướng Sidebar
Sidebar chuẩn của hệ thống gồm 6 mục:
1. **Trang chủ** (`/home` - `tabler-smart-home`): Tổng quan tình hình nhân sự, hoạt động trong tuần, số dư quỹ.
2. **Nhân sự** (`/users` - `tabler-users`): Quản lý toàn bộ danh sách, kích hoạt, phân loại Type & Category.
3. **Lịch bê nước** (`/water-schedule` - `tabler-droplet`): Xếp lịch tuần theo tháng, random công bằng, xác nhận hoàn thành.
4. **Quỹ phòng** (`/fund` - `tabler-wallet`): Quản lý danh sách đóng quỹ hàng tháng và các khoản chi.
5. **Tài sản cá nhân** (`/assets` - `tabler-package`): Quản lý phân bổ thiết bị, tài sản nội bộ.
6. **Lịch sử hoạt động** (`/audit-logs` - `tabler-history`): Nhật ký kiểm toán thao tác quản trị (**Chỉ Admin truy cập**).

---

## 5. Quy Tắc Phân Quyền Trên Giao Diện (Role-Based UI Rules)

Hệ thống có hai vai trò chính: **Admin** và **User**. Giao diện phải tuân thủ nghiêm ngặt các nguyên tắc sau:

### 5.1. Vai Trò Admin
- Được toàn quyền truy cập tất cả các trang, bao gồm `/audit-logs`.
- Nhìn thấy các nút thao tác: `Thêm`, `Sửa`, `Xóa`, `Random`, `Kích hoạt`, `Lưu thay đổi`, `Xuất Excel`.
- Tại trang Quỹ: Nhìn thấy checkbox `Đã đóng`, ô sửa số tiền, nút thêm khoản chi.
- Tại trang Bê nước: Nhìn thấy bộ xếp lịch, nút random, nút đổi người và checkbox xác nhận ai đã đi.

### 5.2. Vai Trò User (Nhân viên)
- **Bảo mật tuyệt đối**: Không nhìn thấy mục `Lịch sử hoạt động` trên Sidebar; chặn truy cập vào `/audit-logs` ở cấp Middleware.
- **Chế độ Chỉ Đọc (Read-only)**:
  - **Trang Quỹ**: Xem bảng danh sách đóng tiền minh bạch nhưng thay thế checkbox bằng Text/Chip "Đã đóng" / "Chưa đóng". Không hiển thị nút sửa tiền, không có nút thêm khoản chi.
  - **Trang Bê nước**: Chỉ xem lịch của chính mình ("Lịch bê nước của tôi"), tổng điểm và lượt của bản thân. Ẩn toàn bộ nút random, xếp lịch và bảng điểm của đồng nghiệp.
- **Trang Cá nhân**: Chỉ cho phép tự cập nhật Số điện thoại và Giới tính cá nhân.
