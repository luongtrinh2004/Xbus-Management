# Người theo dõi công việc (F0512)

Các endpoint ứng dụng dùng session Plane, cùng project/issue hiện tại; không có model hoặc quyền mới.

Base: `/api/workspaces/{slug}/projects/{project_id}/issues/{issue_id}`.

| Thao tác | URL | Body | Kết quả |
| --- | --- | --- | --- |
| Danh sách người theo dõi thật | `GET /issue-subscribers/` | — | 200, mảng `IssueSubscriberSerializer` (gồm `id`, `subscriber`) |
| Thay danh sách, nguyên tử | `PUT /issue-subscribers/` | `{"subscriber_ids":["<user UUID>"]}` | 200, danh sách đã lưu; mảng rỗng bỏ tất cả |
| Thêm một người | `POST /issue-subscribers/` | `{"subscriber":"<user UUID>"}` | 201 khi mới, 200 nếu đã theo dõi |
| Bỏ một người | `DELETE /issue-subscribers/{user_id}/` | — | 204, kể cả đã bỏ |
| Tự theo dõi | `POST /subscribe/` | — | 201/200, idempotent |
| Tự bỏ theo dõi | `DELETE /subscribe/` | — | 204, idempotent |
| Trạng thái của tôi | `GET /subscribe/` | — | 200, `{"subscribed":true/false}` |

GET trước đây trả roster project (không phản ánh quan hệ theo dõi); hiện trả đúng quan hệ. Không tìm thấy frontend caller cũ của endpoint danh sách. UI quản lý dùng MemberSelect, service và subscription store chung cho panel và trang chi tiết; nút Theo dõi/Bỏ theo dõi đồng bộ cùng store. Refresh nền 30 giây, không gọi là realtime.

Phải có tài khoản và membership Workspace/Project đang hoạt động. Guest chỉ thấy công việc theo chính sách Plane (`guest_view_all_features` hoặc người tạo); quan hệ theo dõi không cấp quyền truy cập mới. Thêm/bớt người khác yêu cầu Member/Admin của Project. Người được thêm phải là thành viên hoạt động, có quyền xem công việc. Từ chối UUID sai, trùng, người ngoài project/đã khóa/không đủ quyền; PUT có lỗi không thay đổi dữ liệu. Công việc/project đã lưu trữ không được thêm/sửa danh sách; vẫn cho bỏ theo dõi chính mình.

Không sửa assignee, project hoặc hạn khi thay người theo dõi. Các thông báo hoạt động và nhắc hạn tiếp tục dùng quan hệ `IssueSubscriber` hiện có.
