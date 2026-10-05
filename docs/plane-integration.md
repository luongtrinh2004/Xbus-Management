# Plane Community Edition trong XBus Office

`/work/projects` nhúng nguyên giao diện Plane Community Edition. Plane chạy như
một ứng dụng độc lập vì frontend, API, realtime service và authentication của
Plane không thể được import trực tiếp thành component Next.js.

Source chính thức được clone tại `services/plane` và giữ nguyên giấy phép
AGPL-3.0. Không xóa các tệp `LICENSE` và `COPYRIGHT.txt` của Plane.

## Chạy local

```bash
cp plane.env.example plane.env
```

Thay toàn bộ giá trị `replace-with-*` trong `plane.env` bằng secret ngẫu nhiên,
sau đó chạy:

```bash
npm run plane:start
```

Frontend dùng image local `xbus-plane-frontend:1.4.2-hydration-fix`, được build
từ image Plane đã pin digest. Bản vá giữ `HydrateFallback` là `<div />` trong
lần render đầu tiên, rồi hiển thị spinner sau khi mount để tránh lỗi React
418/423 do theme của trình duyệt khác HTML prerender. Nếu đổi phiên bản Plane,
cần cập nhật và kiểm tra lại `services/plane-xbus/Dockerfile.web`.

Plane mở tại `http://localhost:3100`. Thêm vào `.env.local` của XBus:

```env
NEXT_PUBLIC_PLANE_URL=http://localhost:3100
```

Khởi động lại Next.js rồi truy cập `http://localhost:3000/work/projects`.

Các lệnh vận hành:

```bash
npm run plane:logs
npm run plane:stop
```

## Production

Plane sử dụng các route cấp gốc `/api`, `/auth`, `/live`, `/spaces` và
`/god-mode`, trùng với route của XBus. Vì vậy không proxy Plane bằng cách strip
prefix `/work/projects`. Hãy cấp một origin riêng, ví dụ:

```text
XBus:  https://office.example.com
Plane: https://plane.office.example.com
```

Đặt `WEB_URL`, `CORS_ALLOWED_ORIGINS` trong `plane.env` và
`NEXT_PUBLIC_PLANE_URL` trong môi trường build XBus thành URL HTTPS của Plane.
Reverse proxy production phải cho phép Plane được hiển thị trong iframe từ
origin XBus; không thêm `X-Frame-Options: DENY` và cấu hình CSP `frame-ancestors`
phù hợp nếu proxy đang áp CSP chung.

## Nhân sự và đăng nhập XBus

API Plane dùng image local `xbus-plane-backend:1.4.2-identity-bridge`.
Cấu hình một secret ngẫu nhiên (ít nhất 32 byte), giống nhau tại hai nơi:
`PLANE_BRIDGE_SECRET` trong môi trường server XBus và `XBUS_BRIDGE_SECRET`
trong `plane.env`. Không dùng tiền tố `NEXT_PUBLIC_` cho secret.
`PLANE_INTERNAL_URL` là origin Plane mà server XBus truy cập được;
`NEXT_PUBLIC_PLANE_URL` là origin trình duyệt truy cập được.

Khi mở `/work/projects`, XBus kiểm tra lại trạng thái tài khoản từ dữ liệu
nhân sự, đồng bộ vào workspace `xbus-office`, rồi cấp vé đăng nhập Plane
có thời hạn 60 giây, dùng một lần, gửi bằng form POST để không lộ trong URL
hoặc access log, rồi mở thẳng danh sách dự án Plane. Quản trị viên XBus có quyền Admin trong
workspace; nhân sự khác có quyền Member. Nhân sự bị vô hiệu hóa hoặc bị loại
khỏi danh sách mất quyền truy cập nhưng lịch sử công việc được giữ lại.
Đồng bộ thủ công: `npm run plane:sync-personnel`.

Chỉ đồng bộ danh tính công việc: tên, email, mã nhân sự, bộ phận, hình thức
làm việc, chức danh và URL avatar. Avatar dùng ảnh riêng trong XBus hoặc ảnh
mặc định theo vai trò/giới tính nếu chưa có ảnh riêng; URL tương đối được chuyển
thành URL đầy đủ từ `NEXTAUTH_URL`, giữ nguyên storage và version để Plane tải
đúng ảnh từ XBus. Không chuyển mật khẩu, CCCD, địa chỉ, ngày sinh hay dữ
liệu tài chính. Tài khoản Plane tạo từ XBus không có mật khẩu riêng.
Nếu email đã thuộc tài khoản Plane khác, đồng bộ dừng để tránh gán nhầm người.
Không tự tạo dự án hoặc công việc mẫu.

Local dùng cùng hostname `localhost` cho cả XBus và Plane. Production nên dùng
hai subdomain cùng một site HTTPS để cookie Plane hoạt động trong iframe.
