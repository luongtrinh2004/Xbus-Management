# Chuyển Dữ Liệu Xbus Từ JSON Sang MySQL

## 1. Mục tiêu và phạm vi

Trước đây ứng dụng lưu nghiệp vụ trong `src/data/json/*.json`. Hiện source đã có lớp `src/libs/dataRepository.js`: đặt `DATA_SOURCE=mysql` thì API đọc/ghi MySQL; `DATA_SOURCE=json` chỉ là phương án rollback tạm thời khi JSON snapshot vẫn còn.

Mục tiêu migration:

- Giữ nguyên ID nghiệp vụ hiện hữu (`usr_*`, `fund_*`, `log_*`), không đổi URL/API client.
- Chuyển dữ liệu sang MySQL 8; dùng transaction và foreign key.
- Cho phép chạy song song giai đoạn kiểm chứng, sau đó chuyển đọc/ghi hoàn toàn sang MySQL.
- Không lưu avatar/binary vào MySQL; DB chỉ lưu URL. Avatar ở volume/file system, menu trà chiều cũng vậy.

## 2. Cấu trúc dữ liệu JSON hiện tại

| File                    | Root key                      | Dữ liệu                                                        |
| ----------------------- | ----------------------------- | -------------------------------------------------------------- |
| `users.json`            | `users`                       | Nhân sự, xác thực, vai trò, bộ phận, hình thức, điểm rèn luyện |
| `types.json`            | `types`                       | Bộ phận chuyên môn                                             |
| `categories.json`       | `categories`                  | Hình thức nhân sự                                              |
| `funds.json`            | `funds`                       | Kỳ quỹ, khoản đóng, thu, chi                                   |
| `assets.json`           | `imports`, `exports`          | Phiếu nhập/xuất tài sản; tồn kho được tính động                |
| `water-schedules.json`  | `schedules`                   | Lịch bê nước và người tham gia                                 |
| `water-exemptions.json` | `userIds`                     | Danh sách miễn bê nước                                         |
| `afternoon-tea.json`    | `menuImageUrl`, `invitations` | Ảnh menu và lời mời trà chiều                                  |
| `audit-logs.json`       | `auditLogs`                   | Nhật ký thao tác                                               |
| `settings.json`         | object                        | Cấu hình toàn hệ thống                                         |

### 2.1. Thực thể nhân sự

`users`: `id`, `googleId`, `name`, `email`, `code`, `avatarUrl`, `gender`, `phone`, `role`, `typeId`, `categoryId`, `status`, `password`, `birthday`, `schedulingPoints`, `waterTripCount`, `createdAt`, `updatedAt`, `activatedAt`, `activatedBy`.

Quan hệ: một nhân sự thuộc tối đa một bộ phận (`typeId`) và một hình thức (`categoryId`); một nhân sự có nhiều đóng quỹ, lịch bê nước, giao dịch tài sản (qua tên hiện tại), audit log.

#### Quy tắc kích hoạt và avatar hiện hành

- Người dùng đăng nhập lần đầu bằng Google với email công ty được tạo thành `status: disabled` và xuất hiện tại **Tài Khoản Chờ Kích Hoạt**. Không tự kích hoạt theo `defaultUserStatus`.
- Admin phải điền **mã nhân sự** hợp lệ, duy nhất trước khi chuyển trạng thái sang `able`. API cũng kiểm tra điều kiện này, nên không thể bỏ qua bằng request thủ công.
- Mã được chuẩn hóa in hoa và chỉ nhận chữ cái (kể cả `Đ`), số, `_`, `-`; MySQL bảo vệ thêm bằng `UNIQUE(code)`.
- Avatar không nằm trong MySQL. Mỗi nhân sự có đúng một thư mục: `public/images/avatars/<MA_NHAN_SU>/` và đúng một file `<MA_NHAN_SU>.<jpg|png|webp>`. Upload mới xóa ảnh/thư mục cũ trước khi lưu ảnh mới; khi đổi mã nhân sự, ảnh được chuyển sang thư mục/mã mới.

### 2.2. Quỹ phòng

`funds`: `id`, `year`, `month`, `openingBalance`, `members[]`, `incomes[]`, `expenses[]`, `updatedAt`.

- `members[]`: `userId`, `paid`, `amount`, `paidAt`, `updatedAt`, `approvedBy`; phiên bản PayOS bổ sung `paymentStatus`, `orderCode`, `paymentLinkId`, `checkoutUrl`, `paymentReference`.
- `incomes[]`: `id`, `title`, `category`, `amount`, `note`, `userId`, `userName`, `receivedAt`, `createdBy`, `createdByName`, `createdAt`.
- `expenses[]`: cùng dạng income, dùng `spentAt`.

Mỗi kỳ quỹ duy nhất theo `(year, month)`. Tổng thu, chi và số dư hiện là dữ liệu tính toán, không lưu cứng.

### 2.3. Lịch bê nước

`schedules[]`: `id`, `year`, `month`, `weekIndex`, `range`, `validDays[]`, `date`, `time`, `requiredPeople`, `status`, `note`, `participants[]`, timestamps.

`participants[]`: `userId`, `name`, `code`, `completed`. Tên/mã là snapshot hiển thị; `userId` là khóa nghiệp vụ.

### 2.4. Tài sản, trà chiều và audit

- Phiếu tài sản nhập/xuất: `id`, `code`, `name`, `date`, `quantity`, `location`, `person`, `note`, timestamps. Tồn kho = tổng nhập trừ tổng xuất theo `code`.
- Lời mời trà chiều phải được tách thành invitation và invitation participant/response khi migrate; ảnh menu chỉ lưu URL/path.
- Audit log: `id`, `adminId`, `adminName`, `adminEmail`, `action`, `targetType`, `targetId`, `details`, `ip`, `timestamp`.
- Settings gồm domain email, role/status mặc định, số người bê nước mặc định và mức đóng quỹ tối thiểu.

## 3. Schema MySQL đề xuất

| Bảng                          | Khóa chính                  | Quan hệ/chỉ mục chính                                                                  |
| ----------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `users`                       | `id VARCHAR(64)`            | `email UNIQUE`, `code UNIQUE NULL`, FK `department_id`, `employment_category_id`       |
| `departments`                 | `id VARCHAR(64)`            | `name UNIQUE`                                                                          |
| `employment_categories`       | `id VARCHAR(64)`            | `name UNIQUE`                                                                          |
| `app_settings`                | `setting_key VARCHAR(100)`  | JSON value hoặc cột riêng cho cấu hình phổ biến                                        |
| `fund_periods`                | `id VARCHAR(64)`            | `UNIQUE(year, month)`                                                                  |
| `fund_member_payments`        | `id BIGINT`                 | `UNIQUE(fund_period_id, user_id)`, FK kỳ quỹ/user/approver                             |
| `fund_transactions`           | `id VARCHAR(64)`            | FK kỳ quỹ, user; `kind ENUM('income','expense')`, `category`, `occurred_at`            |
| `fund_reminder_logs`          | `id BIGINT`                 | FK kỳ quỹ/user; `UNIQUE(fund_period_id,user_id,reminder_date,trigger)`                 |
| `asset_transactions`          | `id VARCHAR(64)`            | `type ENUM('import','export')`, index `(asset_code, transaction_date)`                 |
| `water_schedules`             | `id VARCHAR(64)`            | `UNIQUE(year,month,week_index)`                                                        |
| `water_schedule_participants` | `id BIGINT`                 | FK schedule/user; `UNIQUE(schedule_id,user_id)`                                        |
| `water_exemptions`            | `user_id VARCHAR(64)`       | FK user                                                                                |
| `app_documents`               | `document_key VARCHAR(100)` | JSON document cho trạng thái trà chiều/menu; tách bảng chi tiết ở pha tối ưu tiếp theo |
| `audit_logs`                  | `id VARCHAR(64)`            | index `(timestamp)`, `(target_type,target_id)`, `(admin_id,timestamp)`                 |

### Quy tắc kiểu dữ liệu

- Tiền dùng `BIGINT UNSIGNED` (VNĐ), tuyệt đối không dùng `FLOAT`.
- Ngày nghiệp vụ: `DATE`, tuyệt đối không convert qua `Date#toISOString()`.
- Thời điểm: `DATETIME(3)` theo giờ Việt Nam (`+07:00`) ở tầng MySQL. Repository luôn đọc/ghi với `timezone: "+07:00"`, còn API trả ISO timestamp và UI format rõ `Asia/Ho_Chi_Minh`.
- Các enum linh hoạt (`role`, `status`, payment status) dùng `VARCHAR(32)` + validation application để dễ mở rộng.
- URL/path avatar/menu: `VARCHAR(1024)`.
- Nội dung audit/note: `TEXT`; dữ liệu ít truy vấn linh hoạt dùng `JSON`.

### 3.1. Repository runtime

`src/libs/dataRepository.js` là lớp duy nhất API sử dụng. Khi `DATA_SOURCE=json`, lớp này gọi repository JSON cũ; khi `DATA_SOURCE=mysql`, nó đọc/ghi MySQL. Vì vậy không thay đổi response contract của frontend trong lúc cutover.

- Dữ liệu quan hệ: user, department, category, quỹ, tài sản, lịch bê nước, miễn lịch, audit log dùng bảng riêng.
- Trà chiều/menu dùng `app_documents` để bảo toàn toàn bộ cấu trúc JSON hiện tại trong MySQL; không còn ghi file JSON khi runtime MySQL được bật.
- Ảnh avatar/menu vẫn là file volume; DB chỉ lưu đường dẫn URL.

## 4. Migration theo giai đoạn

1. **Chuẩn bị**: thêm MySQL 8 vào `docker-compose`, tạo DB/user quyền tối thiểu, backup toàn bộ JSON và volume ảnh.
2. **Schema**: tạo migration versioned (khuyến nghị Prisma Migrate hoặc Drizzle Kit); áp dụng FK sau khi import dữ liệu sạch.
3. **Import một lần**: script đọc JSON, insert theo thứ tự `departments/categories → users → fund periods/payments/transactions → schedules/participants → assets → audit` trong transaction theo nhóm.
4. **Đối soát**: so số lượng users, fund periods, tổng tiền theo kỳ, số payment đã đóng, số schedule/participant và checksum audit log.
5. **Dual-read có kiểm soát**: staging đọc MySQL, so sánh kết quả với JSON; production vẫn ghi JSON.
6. **Cutover**: bật repository MySQL qua feature flag, tạm dừng ghi JSON, chạy import delta cuối, chuyển traffic.
7. **Rollback**: giữ snapshot JSON và feature flag; chỉ rollback trước khi có ghi mới chỉ-Mysql, hoặc export delta ngược lại.
8. **Dọn dẹp**: sau ít nhất 30 ngày ổn định, bỏ JSON repository khỏi luồng runtime; giữ backup read-only theo chính sách.

## 5. Thay đổi code

- Giữ interface repository (`getUsers`, `saveUsers`, `getFunds`...) trong giai đoạn đầu nhưng thay implementation bằng repository MySQL async.
- Chuyển route handlers từ thao tác mảng sang query transaction.
- Các thay đổi nhiều bảng (xác nhận PayOS, đóng quỹ, hủy giao dịch, hoàn điểm) bắt buộc dùng transaction SQL.
- Password hash hiện có bcrypt được giữ nguyên; không reset mật khẩu khi migrate.
- Tạo migration script idempotent, có `--dry-run` và log lỗi theo record.

## 6. Vận hành và backup

- MySQL volume riêng; backup logical hằng ngày bằng `mysqldump` và kiểm thử restore định kỳ.
- Không commit `.env`, database dump chứa dữ liệu cá nhân hoặc App Password.
- Không phụ thuộc timezone mặc định của VPS: connection MySQL phải đặt `+07:00`; UI format `Asia/Ho_Chi_Minh` khi hiển thị.
- Theo dõi connection, dung lượng volume, slow query và lỗi migration.

## 7. Quy trình đã kiểm tra ở máy local

> Trạng thái hiện tại: repository MySQL đã được triển khai và local đang chạy với `DATA_SOURCE=mysql`. JSON chỉ cần giữ như bản snapshot/import source trước cutover; không được xóa bản backup production trước khi đối soát và vận hành ổn định.

### 7.1. Khởi động MySQL local bằng Docker

```powershell
docker run --name xbus-mysql `
  -e MYSQL_ROOT_PASSWORD=123456 `
  -e MYSQL_DATABASE=xbus `
  -e MYSQL_USER=xbus `
  -e MYSQL_PASSWORD=123456 `
  -p 127.0.0.1:3306:3306 `
  -v xbus_mysql_data:/var/lib/mysql `
  -d mysql:8.4 `
  --character-set-server=utf8mb4 `
  --collation-server=utf8mb4_unicode_ci
```

- Chỉ bind `127.0.0.1` để MySQL không mở ra mạng LAN/Internet.
- Các password trên chỉ dùng local; không dùng lại ở VPS/production.

Kiểm tra health:

```powershell
docker exec xbus-mysql mysqladmin ping -h 127.0.0.1 -uxbus -p123456 --silent
docker exec -it xbus-mysql mysql -uxbus -p123456 xbus
```

### 7.2. Tạo schema và import JSON

Migration nằm tại `database/migrations/`. Luôn dùng script migration để lưu version đã áp dụng:

```powershell
npm run db:migrate
npm run db:import-json
```

Script `scripts/import-json-to-mysql.mjs` đọc toàn bộ JSON theo thứ tự quan hệ và chạy trong transaction. Script idempotent: chạy lại sẽ update record theo khóa hiện có, không nhân đôi dữ liệu.

> Chỉ chạy `db:import-json` khi đã có một snapshot JSON đầy đủ trong `src/data/json/`. Khi local đã cutover và thư mục JSON đã được dọn, **không chạy lại import**: MySQL là nguồn dữ liệu chính.

### 7.3. Chạy local bằng MySQL

Tạo file `.env.local` (không commit) để Next.js luôn dùng MySQL local ở các lần chạy sau:

```env
DATA_SOURCE=mysql
DATABASE_URL=mysql://xbus:123456@127.0.0.1:3306/xbus
```

Sau đó chạy `npm run dev` tại thư mục `C:\Xbus`. Kiểm tra nhanh nguồn dữ liệu:

```powershell
$env:DATA_SOURCE
docker exec xbus-mysql mysql -uxbus -p123456 xbus -e "SELECT COUNT(*) AS users FROM users;"
```

### 7.4. Kết quả import mẫu đã xác minh

| Bảng                   | Số bản ghi |
| ---------------------- | ---------: |
| `users`                |         29 |
| `fund_periods`         |          1 |
| `fund_member_payments` |         12 |
| `fund_transactions`    |          7 |
| `asset_transactions`   |          5 |
| `water_schedules`      |          5 |
| `audit_logs`           |         92 |

Kiểm tra lại thủ công:

```powershell
docker exec xbus-mysql mysql -uxbus -p123456 -Nse "SELECT (SELECT COUNT(*) FROM users), (SELECT COUNT(*) FROM fund_periods), (SELECT COUNT(*) FROM fund_member_payments), (SELECT COUNT(*) FROM fund_transactions), (SELECT COUNT(*) FROM asset_transactions), (SELECT COUNT(*) FROM water_schedules), (SELECT COUNT(*) FROM audit_logs);" xbus
```

Lưu ý: dữ liệu lịch bê nước có thể có nhiều record cùng `(year, month, week_index)`, vì vậy schema dùng index `ix_water_period`, không dùng unique key cho ba cột này.

## 8. Cài đặt trên VPS

### 8.1. Chuẩn bị và backup

Trước mọi thao tác phải backup JSON volume và xác minh file backup tồn tại:

```bash
cd /home/stackops/xbus-management
docker compose down
docker run --rm \
  -v xbus-management_xbus_data:/data:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/xbus-json-$(date +%F).tar.gz -C /data .
docker compose up -d
```

Không xóa volume JSON trong giai đoạn migration.

### 8.2. Docker Compose và volume ảnh

Service `xbus-office` phải giữ volume avatar khi deploy/rebuild:

```yaml
xbus-office:
  volumes:
    - xbus_avatars:/app/public/images/avatars
```

Avatar được lưu trong volume theo cấu trúc `/<MÃ>/<MÃ>.<ext>`; không xóa `xbus_avatars` khi deploy.

Thêm service MySQL nội bộ:

Thêm service nội bộ, không khai báo `ports:`:

```yaml
  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: xbus
      MYSQL_USER: xbus
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

Trong `.env` VPS dùng cấu hình hiện tại của dự án:

```env
DATA_SOURCE=json
MYSQL_PASSWORD=462004
MYSQL_ROOT_PASSWORD=462004
DATABASE_URL=mysql://xbus:462004@mysql:3306/xbus
```

Không commit `.env`; không mở `3306` qua firewall/Nginx. Compose chỉ bind MySQL tại `127.0.0.1:3307` trên VPS để MySQL Workbench có thể dùng SSH tunnel; MySQL không công khai ra Internet.

Migration không được mount trực tiếp vào `/docker-entrypoint-initdb.d`; dùng `npm run db:migrate` để có bảng `schema_migrations` và tránh chạy lặp migration khi restart container.

### 8.3. Khởi tạo và import production

Tại thư mục repository trên VPS, chạy duy nhất lệnh sau. Script sẽ ghi các biến MySQL nêu trên vào `.env`, khởi động MySQL, áp dụng migration, build ứng dụng, import JSON và in kết quả đối soát:

```bash
bash scripts/setup-mysql-vps.sh
```

Điều kiện: VPS đang ở nhánh có `scripts/setup-mysql-vps.sh`, `database/migrations/` và các script `db:migrate`, `db:import-json`. Kiểm tra nhanh:

```bash
git branch --show-current
grep -n '"db:import-json"' package.json
grep -n '"db:migrate"' package.json
```

Nếu MySQL từng được khởi tạo với mật khẩu khác, chỉ sửa `.env` sẽ không đổi mật khẩu đã lưu trong volume. Khi đó cần đăng nhập bằng mật khẩu cũ để `ALTER USER`, hoặc (chỉ khi không cần dữ liệu MySQL cũ) xóa riêng volume `mysql_data` rồi chạy lại script.

Đối soát row count và tổng tiền quỹ trên JSON/MySQL trước khi đổi `DATA_SOURCE`.

### 8.4. Cutover và rollback

1. Dừng ghi dữ liệu ngắn hạn (maintenance window).
2. Chạy `npm run db:import-json` lần cuối để lấy delta.
3. Đặt `DATA_SOURCE=mysql`, rebuild/restart app. Từ thời điểm này API đọc/ghi các bảng MySQL; JSON chỉ còn là bản rollback.
4. Kiểm thử đăng nhập, user, quỹ, PayOS, tài sản, lịch nước, audit log.
5. Nếu lỗi trước khi phát sinh dữ liệu chỉ-Mysql: đặt lại `DATA_SOURCE=json` và restart.

Sau khi MySQL ổn định tối thiểu 30 ngày mới cân nhắc loại JSON repository khỏi runtime.

Lệnh cutover trên VPS (chỉ chạy sau khi đã kiểm tra số liệu import):

```bash
cd /home/stackops/xbus-management && \
docker compose exec -T xbus-office npm run db:migrate && \
docker compose exec -T xbus-office npm run db:import-json && \
sed -i 's/^DATA_SOURCE=.*/DATA_SOURCE=mysql/' .env && \
docker compose up -d --build --force-recreate xbus-office && \
curl -I http://127.0.0.1:3000/login
```

Rollback nhanh (chỉ an toàn nếu chưa có dữ liệu mới chỉ ghi ở MySQL):

```bash
cd /home/stackops/xbus-management && \
sed -i 's/^DATA_SOURCE=.*/DATA_SOURCE=json/' .env && \
docker compose up -d --build --force-recreate xbus-office
```

### 8.5. Backup MySQL hằng ngày

```bash
docker compose exec -T mysql mysqldump -uxbus -p"$MYSQL_PASSWORD" --single-transaction xbus > /home/stackops/backups/xbus-mysql-$(date +%F).sql
```

Khôi phục thử nghiệm:

```bash
cat /home/stackops/backups/xbus-mysql-YYYY-MM-DD.sql | docker compose exec -T mysql mysql -uxbus -p"$MYSQL_PASSWORD" xbus
```

### 8.6. Kết nối MySQL Workbench đến MySQL trên VPS qua SSH

Không mở firewall port `3306`. MySQL Workbench tạo SSH tunnel đến VPS, sau đó kết nối vào port loopback `3307` của VPS.

1. Trên VPS, sau khi chạy compose, kiểm tra port nội bộ đã bind:

   ```bash
   docker compose ps mysql
   ss -ltn | grep 3307
   ```

   Kết quả phải có `127.0.0.1:3307`, không phải `0.0.0.0:3306`.

2. Trong **MySQL Workbench** chọn dấu `+` ở **MySQL Connections**, sau đó chọn:

   | Trường            | Giá trị                                                              |
   | ----------------- | -------------------------------------------------------------------- |
   | Connection Method | `Standard TCP/IP over SSH`                                           |
   | SSH Hostname      | `<IP-hoặc-domain-VPS>:22`                                            |
   | SSH Username      | `stackops`                                                           |
   | SSH Key File      | private key SSH của VPS, hoặc để trống để Workbench hỏi mật khẩu SSH |
   | MySQL Hostname    | `127.0.0.1`                                                          |
   | MySQL Server Port | `3307`                                                               |
   | Username          | `xbus`                                                               |
   | Password          | `462004` (Store in Vault nếu muốn)                                   |
   | Default Schema    | `xbus`                                                               |

3. Bấm **Test Connection**. Nếu thành công, mở connection và chạy:

   ```sql
   SELECT VERSION();
   SHOW TABLES;
   SELECT COUNT(*) AS users FROM users;
   ```

Nếu Workbench báo timeout SSH, kiểm tra host/user/key SSH. Nếu SSH thành công nhưng MySQL lỗi, kiểm tra `docker compose ps mysql`, port `127.0.0.1:3307` và password trong `.env` trên VPS.
