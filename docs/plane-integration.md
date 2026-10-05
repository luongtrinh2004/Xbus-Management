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

Plane được tích hợp như module trên cùng origin HTTPS của XBus. Người dùng
vào `/work/projects`; iframe dùng `/xbus-office/projects/`. Nginx chuyển các
route Plane được liệt kê trong `services/plane-xbus/nginx.module.conf` tới
cổng nội bộ 3100, giữ `/api/auth`, `/api/work`, `/api/users` và `/api/assets`
của XBus. Không cần domain thứ hai hay cổng công khai 8443.

```text
XBus:             https://xbus-office.xmobility.vn/work/projects
Plane bên trong:  https://xbus-office.xmobility.vn/xbus-office/projects/
```

`deploy.sh` cài snippet vào Nginx hiện có, sao lưu cấu hình trước khi sửa và
kiểm tra `nginx -t` trước khi reload. Đặt `PUBLIC_PLANE_URL` bằng
`PUBLIC_APP_URL` trong `.deploy.env`; script cập nhật `WEB_URL`,
`CORS_ALLOWED_ORIGINS`, `PLANE_PUBLIC_URL` và `NEXT_PUBLIC_PLANE_URL` tương ứng.
XBus trong Docker gọi backend qua `PLANE_INTERNAL_URL=http://host.docker.internal:3100`.
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

Local dùng cùng hostname `localhost` cho cả XBus và Plane. Production dùng
cùng origin HTTPS qua Nginx; cookie Plane và NextAuth vẫn là các phiên riêng.
