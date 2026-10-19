# Plane Community Edition trong XBus Office

`/work/projects` nhúng nguyên giao diện Plane Community Edition. Plane chạy như
một ứng dụng độc lập vì frontend, API, realtime service và authentication của
Plane không thể được import trực tiếp thành component Next.js.

Source chính thức được lưu trực tiếp tại `services/plane` như mã nguồn vendor,
không còn là Git submodule, và vẫn giữ nguyên giấy phép AGPL-3.0. Không xóa các
tệp `LICENSE` và `COPYRIGHT.txt` của Plane.

## Chạy local

```bash
cp plane.env.example plane.env
```

Thay toàn bộ giá trị `replace-with-*` trong `plane.env` bằng secret ngẫu nhiên,
sau đó chạy:

```bash
npm run plane:start
```

Frontend dùng image local `xbus-plane-frontend:1.4.2-xbus-source`, build trực tiếp
từ source tại `services/plane` bằng `services/plane-xbus/Dockerfile.web`.
`npm run plane:start` build lại image để đưa thay đổi UI/UX vào module XBus.
Build bật `VITE_XBUS_EMBEDDED=true` để ẩn thanh điều hướng trên cùng của Plane
và dùng tiêu đề XBus Work. Hydration fallback được sửa trong source thay vì
vá bundle đã biên dịch. API và các dịch vụ nền vẫn chạy riêng trong Docker.

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

`bash deploy.sh` build cả Plane backend, Plane frontend và XBus Office trên VPS.
Các build chạy tuần tự và hoàn tất trước bước thay container. Để kiểm tra cùng
quy trình build tại local, chạy `bash deploy.sh --build-only`; chế độ này không
SSH, không restart và không chạy migration. Cả hai chế độ dùng
`scripts/build-office-plane.sh` để giữ thống nhất các lệnh build.

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

API Plane dùng image local `xbus-plane-backend:1.4.2-review`, gồm source backend,
identity bridge và các tùy chỉnh Workflow/nghiệm thu XBus.
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

## Giao diện tiếng Việt của module Quản lý công việc

XBus dùng tiếng Việt (`vi-VN`) cho module Plane. Bản frontend nhúng bật
`VITE_XBUS_EMBEDDED=true`, bỏ qua lựa chọn tiếng Anh còn lưu trên trình duyệt
hoặc hồ sơ cũ, và chỉ hiển thị lựa chọn Tiếng Việt. Cầu nối nhân sự cập nhật
`Profile.language` khi đồng bộ, áp dụng cả cho tài khoản đã tồn tại.

Thuật ngữ thống nhất:

| Nội dung | Cách hiển thị |
| --- | --- |
| Work item | Công việc |
| Assignee | Người phụ trách |
| Module | Nhóm công việc |
| Intake | Tiếp nhận |
| Cycle | Chu kỳ |
| Due date | Hạn hoàn thành |
| View | Chế độ xem |
| Workspace | Không gian làm việc |

Giữ tên sản phẩm, tên công nghệ và thuật ngữ chuyên ngành như Plane, GitHub,
API, OAuth, SAML, SMTP, webhook, Kanban, Gantt, Epic và Sprint. Không dịch
URL, mã định danh, khóa API, nội dung dự án/công việc hoặc tên trạng thái do
người dùng tự đặt. Tên trạng thái mặc định được dịch ở lớp hiển thị bằng
`getStateDisplayName`; tên, ID và nhóm trạng thái trong dữ liệu vẫn giữ nguyên.

Sau khi sửa source, chạy `npm run plane:start` để build lại frontend và API.
Để phát triển frontend bằng source, bật `VITE_XBUS_EMBEDDED=true` trong môi
trường chạy Vite. Các image admin, space và live trong Compose vẫn là image
upstream; thay đổi source ở những ứng dụng này cần quy trình build riêng nếu
muốn triển khai giao diện quản trị, chia sẻ công khai hoặc dịch vụ realtime.

Kiểm tra bộ dịch và trạng thái:

```bash
cd services/plane
pnpm --filter @plane/i18n test:vi
pnpm --filter web check:types
VITE_XBUS_EMBEDDED=true pnpm turbo run build --filter=web
```

Các thành phần mới nên dùng `useTranslation` với khóa dịch trong
`packages/i18n/src/locales`, thay vì viết thêm nhãn tiếng Anh trực tiếp.

## Nhắc hạn công việc (Module 7 / F1005)

Tác vụ `plane.bgtasks.issue_due_reminder_task.send_issue_due_reminders` được
Celery Beat gọi mỗi giờ. Công việc còn mở được nhắc trong Inbox vào ngày trước
hạn và một lần sau khi quá hạn. Ngày được tính theo `XBUS_WORK_TIME_ZONE`
(mặc định `Asia/Ho_Chi_Minh`); phạm vi workspace lấy từ `XBUS_WORKSPACE_SLUG`
(mặc định `xbus-office`). Lịch chạy dùng ngày lịch, không phải khoảng 24 giờ.
Nếu worker ngừng chạy vào ngày trước hạn, hệ thống không gửi bù thông báo
“sắp đến hạn” đã hết ý nghĩa; công việc quá hạn vẫn được nhận diện khi chạy lại.

Chỉ assignee còn hoạt động và còn là thành viên hoạt động của cả workspace
và project nhận nhắc hạn. Không gửi cho công việc nháp, tiếp nhận chưa xử lý,
đã hoàn thành, hủy, lưu trữ hoặc xóa. Người theo dõi không tự nhận nhắc hạn.
Mỗi người nhận có tối đa một thông báo cho từng hạn và loại nhắc. Đổi sang hạn
mới cho phép nhận nhắc mới; đọc/lưu trữ/xóa mềm thông báo không tạo lại nhắc cũ.
Đợt này bổ sung kênh trong ứng dụng; chưa bổ sung email/push nhắc hạn.

Migration `0123_issue_due_reminder` chỉ thêm bảng ghi nhận nhắc hạn với ràng buộc
unique; không sửa project, task, thành viên hay lịch sử. Bảng này độc lập với
thông báo để xóa thông báo không làm gửi lại nhắc cũ.
Cần chạy migration trước khi khởi động API/worker mới và khởi động lại Beat
để nạp lịch. Không gọi tác vụ mới với schema cũ. Có thể rollback mã ứng dụng
và giữ bảng bổ sung; chỉ gỡ bảng sau khi API/worker mới đã dừng sử dụng nó.
Gỡ bảng sẽ mất lịch sử chống gửi trùng, nên cần giữ lại nếu dự định bật lại.

Kiểm thử backend (môi trường cô lập theo hướng dẫn trong source Plane):

```bash
cd services/plane
docker compose -p xbus-ba-tests -f docker-compose-test.yml run --rm api-tests \
  pytest plane/tests/contract/bgtasks/test_issue_due_reminders.py \
  plane/tests/unit/serializers/test_issue_date_range.py
```

## Custom field theo Project (Module 7 / F0601–F0603)

Giữ cấu trúc Workspace → Project → Work item và các vai trò Plane. Custom
field là model mở rộng trong database Plane, không tạo hệ công việc song song
trong XBus. Model `IssueCustomField` gắn Project; `IssueCustomFieldValue` gắn
Issue và trường tương ứng. Migration `0124_issue_custom_fields` chỉ thêm bảng
và constraint, không sửa dữ liệu work item hiện có.

Trong bảng List nhúng, nút `+` ở cuối hàng tiêu đề mở quản lý trường. Có thể tạo
text, number, date, single-select, multi-select và people; trường đang hiển thị
trở thành cột sửa trực tiếp. Chi tiết công việc cũng có phần trường tùy chỉnh.
Số hỗ trợ số thường, phần trăm và tiền VND; giá trị lưu vẫn là số. Giá trị ngày
lưu theo `YYYY-MM-DD`, không đổi ngày qua múi giờ khi hiển thị.

Tên/màu/thứ tự/hiển thị lựa chọn có thể thay đổi mà giữ nguyên ID. Trường và
lựa chọn bị ẩn vẫn giữ giá trị cũ. Không cho đổi kiểu trường hoặc loại bỏ ID
lựa chọn đã tạo; muốn đổi kiểu cần tạo trường mới để tránh diễn giải sai dữ liệu.
Admin/Member có thể quản lý trường và giá trị; Guest chỉ đọc theo phạm vi
công việc được xem của Plane. API kiểm tra membership đang hoạt động ở cả
workspace và project, không chỉ dựa vào guard trên UI.

Các endpoint dùng phiên đăng nhập Plane hiện có, dưới:

```text
/api/workspaces/{slug}/projects/{project_id}/custom-fields/
/api/workspaces/{slug}/projects/{project_id}/custom-fields/{field_id}/
/api/workspaces/{slug}/projects/{project_id}/custom-field-values/?issues={id1},{id2}
/api/workspaces/{slug}/projects/{project_id}/issues/{issue_id}/custom-field-values/
```

Danh sách trường hỗ trợ GET/POST, chi tiết hỗ trợ GET/PATCH. Giá trị một công
việc hỗ trợ GET/PUT với payload `{"values":{"field_uuid":"value"}}`; PUT chỉ
cập nhật các trường được gửi, `null` xóa giá trị. Cập nhật nhiều trường cùng
request có transaction; nếu một giá trị không hợp lệ, không lưu phần còn lại.
Thay đổi được ghi vào activity và thông báo trong ứng dụng cho assignee hoặc
subscriber còn đủ quyền. Chưa bổ sung email riêng cho sự kiện custom field.

List tải giá trị theo lô và chia request tối đa 100 work item (API giới hạn
200). Store được dùng chung với chi tiết, tuần tự hóa sửa nhiều ô trên cùng
công việc và bỏ qua kết quả refresh cũ sau khi lưu. Làm mới định kỳ 30 giây;
chưa triển khai WebSocket cho custom field.

Chưa bao gồm thư viện trường xuyên project, formula, mandatory, lọc/sắp xếp/
nhóm theo custom field, trường trong form tạo task, CSV import/export.

Kiểm thử:

```bash
cd services/plane
pnpm --filter web test:custom-fields
pnpm --filter @plane/i18n test:vi
pnpm --filter web check:types
VITE_XBUS_EMBEDDED=true pnpm turbo run build --filter=web
```

Backend: chạy `plane/tests/contract/app/test_issue_custom_fields.py` trong
stack test cô lập theo hướng dẫn của Plane. Migration cần chạy trước API mới.
Khi rollback mã ứng dụng, giữ bảng custom field để giữ giá trị đã nhập; gỡ
migration `0124` sẽ xóa các bảng custom field nên chỉ thực hiện nếu đã có bản
sao lưu và xác định rõ cách giữ/khôi phục dữ liệu đó.
