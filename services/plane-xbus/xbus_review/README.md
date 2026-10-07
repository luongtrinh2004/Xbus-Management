# Nghiệm thu XBus

Phần mở rộng Django cho Plane Community. API, worker, beat và migrator phải dùng cùng image `xbus-plane-backend:1.4.2-review`. Image dùng runtime/dependencies được cố định theo digest, nạp source `apps/api/plane` và phần tích hợp từ build context `xbus_integration`.

## Phạm vi

- Admin workspace/project chọn người nghiệm thu là thành viên dự án đang hoạt động.
- Người được giao hoặc Admin gửi kiểm tra; người nghiệm thu hoặc Admin duyệt/trả lại.
- Bật theo từng công việc; không áp dụng tự động cho dữ liệu cũ. Chưa có thao tác tắt sau khi bật.
- Lịch sử riêng trong `ReviewEvent`. Chưa gửi notification/webhook cho quyết định nghiệm thu.
- Chưa có trình tạo vai trò hoặc ma trận quyền cho toàn bộ tính năng Plane.

API: `GET/POST /api/workspaces/<slug>/projects/<project_id>/issues/<issue_id>/xbus-review/`.
POST nhận `action` (`configure`, `submit`, `approve`, `reject`), `reviewer_id` và `note`.
Sử dụng session Django và CSRF như API Plane.

## Workflow dự án

Màn hình `/<workspace>/settings/projects/<project>/workflows/` cấu hình một workflow mặc định: trạng thái cho phép tạo mới, quyền chuyển từng bước, và bắt buộc nghiệm thu. API `GET/POST /api/workspaces/<slug>/projects/<project_id>/xbus-workflow/` đọc/lưu cấu hình; chỉ Admin được lưu. Menu của trạng thái/luồng cho phép thêm, sửa, xóa luồng. Quyền `user:<uuid>` giới hạn một thành viên dự án đang hoạt động; migration 0003 áp dụng kiểm tra này tại database. Action `initialize_states` bổ sung các nhóm mặc định còn thiếu, giữ tên/quy tắc cũ và có thể gọi lặp lại.

Trigger PostgreSQL `xbus_workflow_guard` áp dụng quy tắc cho INSERT/UPDATE công việc. Middleware đồng bộ bao transaction cho các request ghi và đặt actor của session vào cấu hình transaction; request nghiệm thu cũng đặt actor sau khi xác thực. Tác vụ nền hoặc xác thực API token chưa cung cấp actor theo cơ chế này không được chuyển trạng thái khi workflow bật. Không hỗ trợ chuyển công việc vào dự án có workflow bật. API gốc và middleware đều trả HTTP 409 khi trigger chặn.

Workflow mới mặc định tắt. Bật workflow không thay đổi trạng thái lịch sử; nó kiểm soát những lần tạo mới/chuyển bước tiếp theo. Khi sửa danh sách trạng thái, cần rà soát và lưu workflow lại. Chưa hỗ trợ nhiều workflow theo loại việc, đồ thị kéo thả, hoặc phê duyệt tùy chỉnh cho mọi bước.

## Tính nhất quán

Mọi thao tác nghiệm thu khóa dòng công việc trong transaction. Trigger PostgreSQL chặn cập nhật trạng thái Hoàn thành từ các API khác hoặc cập nhật hàng loạt. Endpoint duyệt dùng cấu hình transaction để cho phép đúng công việc chuyển trạng thái. Serializer trả lỗi rõ ràng cho cập nhật thường; middleware chuyển lỗi trigger thành HTTP 409.

Sửa tên/mô tả làm yêu cầu chờ kiểm tra trở về draft. Mở lại công việc đã duyệt cũng đặt lại draft. Không tự vô hiệu hóa yêu cầu khi thay tệp/bình luận. Phải mở lại trước khi sửa tên/mô tả của công việc đã hoàn thành.

## Kiểm thử local

Sau khi build image, chạy trên stack local; Django tạo và xóa database test riêng:

```sh
docker compose --project-directory . --env-file plane.env -p xbus-plane \
  -f services/plane/deployments/cli/community/docker-compose.yml \
  -f docker-compose.plane.override.yml run --rm --no-deps api \
  python manage.py test plane.xbus_review plane.xbus_tests --noinput
```

Trước triển khai, sao lưu database Plane. Chạy migrator thành công trước khi khởi động API/worker mới. Khi quay lại image cũ, cần xử lý migration này: trigger vẫn hoạt động trong database, trong khi image cũ không có endpoint duyệt. Migration có SQL đảo ngược để gỡ trigger; không chạy rollback migration nếu chưa sao lưu lịch sử nghiệm thu.
