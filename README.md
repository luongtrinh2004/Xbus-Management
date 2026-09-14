# Xbus Office

Ứng dụng quản trị nội bộ của Xbus, xây dựng bằng Next.js 15 và Material UI. Hệ thống hỗ trợ đăng nhập Google Workspace, phân quyền, quản lý nhân sự, lịch bê nước, quỹ phòng, tài sản, trà chiều và nhật ký hoạt động.

## Chức năng

- Đăng nhập Google, liên kết tài khoản theo email `@phenikaa-x.com`; tài khoản mới phải chờ Admin duyệt.
- Vai trò Quản trị viên, Trợ lý và Nhân viên; chỉ Admin được CRUD nhân sự.
- Lịch bê nước dạng lịch tháng, kéo thả, miễn lịch, xếp ngẫu nhiên và xác nhận hoàn thành.
- Quản lý nguồn thu, tiền chi và danh sách đóng quỹ tháng.
- Quản lý phiếu nhập, xuất và tồn kho tài sản.
- Quản lý lời mời, menu và món cho trà chiều.
- Audit log thao tác Admin/Trợ lý, tự dọn dữ liệu quá 30 ngày.

## Yêu cầu

- Node.js 20 nếu chạy trực tiếp.
- Docker Engine và Docker Compose plugin nếu chạy container.
- Google OAuth Client loại **Web application**.
- Reverse proxy HTTPS như Nginx, Caddy hoặc Traefik.

## Chạy local

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`. Google Cloud cần có:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `NEXTAUTH_URL` | Có | URL HTTPS public của ứng dụng |
| `NEXTAUTH_SECRET` | Có | Khóa session, tạo bằng `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Có | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Có | Google OAuth Client Secret |
| `NEXT_PUBLIC_APP_URL` | Nên có | URL public của giao diện |
| `BASEPATH` | Không | Để trống khi chạy tại domain gốc |
| `SKIP_POSTINSTALL` | Không | Có thể đặt `true` trong Docker |

Không commit `.env`, `.env.local` hoặc secret lên Git. Nếu secret từng xuất hiện trong commit, phải tạo secret mới; thêm `.gitignore` không xóa secret khỏi lịch sử Git.

## Kiểm tra trước khi deploy

```bash
npm ci --legacy-peer-deps
npm run build
npm audit --omit=dev
```

Build hiện dùng `--no-lint` vì dự án chưa có cấu hình ESLint hoàn chỉnh. Luôn xem kết quả security audit trước khi phát hành.

## Deploy VPS bằng Docker Compose

### 1. Chuẩn bị

```bash
cd /home/stackops
git clone https://github.com/luongtrinh2004/Xbus-Management.git xbus-management
cd xbus-management
cp .env.example .env
```

Điền secret thật vào `.env`. Trên Google Cloud thêm redirect URI production:

```text
https://office.example.com/api/auth/callback/google
```

### 2. Build và chạy

```bash
docker compose build --pull
docker compose up -d
docker compose ps
docker compose logs -f --tail=200 xbus-office
```

Ứng dụng bind vào `127.0.0.1:3001`; reverse proxy đưa dịch vụ ra HTTPS.

### 3. Nginx

```nginx
server {
    listen 80;
    server_name office.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name office.example.com;

    # Khai báo ssl_certificate và ssl_certificate_key tại đây.
    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Cập nhật

```bash
cd /home/stackops/xbus-management
git pull --ff-only
docker compose build --pull
docker compose up -d
docker image prune -f
```

## Dữ liệu và sao lưu

Ứng dụng dùng file JSON, phù hợp cho **một container duy nhất**. Không chạy nhiều replica vì có nguy cơ ghi đè dữ liệu.

Compose tạo ba volume:

- `xbus_data`: người dùng, lịch, quỹ, tài sản và audit log.
- `xbus_avatars`: avatar upload.
- `xbus_tea_images`: ảnh menu trà chiều.

Ví dụ sao lưu dữ liệu JSON:

```bash
docker run --rm \
  -v xbus-management_xbus_data:/data:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/xbus-data-$(date +%F).tar.gz -C /data .
```

Nên sao lưu hằng ngày và giữ ít nhất 7 bản. Dừng container trước khi restore.

## Kiểm tra sau deploy

```bash
docker compose ps
docker compose logs --tail=200 xbus-office
curl -I https://office.example.com/login
```

Kiểm tra đăng nhập Google, duyệt tài khoản mới, upload avatar/menu, CRUD nhân sự, lịch bê nước, quỹ phòng, tài sản và Audit Log.

## Lưu ý production

- Chỉ chạy một replica khi còn lưu bằng JSON.
- Không public trực tiếp cổng 3001; firewall chỉ mở 80/443.
- Bật HTTPS trước khi dùng Google OAuth.
- Đảm bảo các Docker volume có thể ghi và được backup.
- Định kỳ cập nhật Next.js, NextAuth và chạy `npm audit`.
- Không đưa `.next`, `node_modules`, file Excel/Word hoặc `.env` vào Docker build context.

## Phân quyền

- **Quản trị viên:** toàn quyền và CRUD nhân sự.
- **Trợ lý:** quản trị vận hành, không được CRUD nhân sự.
- **Nhân viên:** xem trang chung và cập nhật thông tin cá nhân.

Phát triển bởi **Lương Trịnh — 22010064**.
