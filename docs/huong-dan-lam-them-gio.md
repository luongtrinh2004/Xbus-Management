# Quản lý làm thêm giờ (OT)

Truy cập **Báo cáo → Làm thêm giờ** trên sidebar, ngay phía trên **Tài chính** (`/overtime`). Mục **Báo cáo → Đi muộn về sớm** (`/late-early`) hiện hiển thị Coming Soon.

## Nhân viên

- Chọn **Thêm mới**, nhập ngày, giờ bắt đầu/kết thúc và lý do. Giờ kết thúc nhỏ hơn giờ bắt đầu được hiểu là ngày hôm sau. Hệ thống tự tính phút đăng ký sau khi trừ thời gian nghỉ cấu hình.
- Chỉ xem được đơn của mình; có thể sửa hoặc hủy đơn **Chờ duyệt**.
- Khi đơn **Đã duyệt** và thời gian OT đã kết thúc, chọn **Báo cáo**, nhập số phút thực tế, nội dung công việc và ghi chú. Đơn chuyển thành **Chờ xác nhận**.
- Nếu Admin hoặc trợ lý yêu cầu cập nhật, đơn trở về **Đã duyệt**; bổ sung và gửi lại báo cáo.
- Đơn **Hoàn thành**, **Từ chối**, **Đã hủy** không chỉnh sửa được.
- Chọn **Xem** để xem báo cáo, lý do từ chối và lịch sử thao tác.

## Admin và trợ lý

- Xem và lọc đơn của toàn bộ nhân sự, hoặc chọn **Cá nhân tôi**.
- Tạo đơn thay nhân viên đang hoạt động; chọn **Duyệt trực tiếp** nếu muốn phê duyệt ngay.
- Duyệt hoặc từ chối đơn chờ duyệt. Từ chối bắt buộc có lý do.
- Xác nhận giờ thực tế hoặc yêu cầu nhân viên cập nhật lại báo cáo. Khi số phút xác nhận khác số phút thực tế, phải ghi lý do.
- Sửa đơn đã duyệt hoặc hủy đơn đang duyệt/chờ xác nhận phải ghi lý do; lịch sử lưu người thao tác và dữ liệu trước/sau.
- **Cấu hình** (chỉ Admin): cho đăng ký quá khứ, giới hạn phút OT ngày/tháng, thời gian nghỉ mỗi đơn, ngày nghỉ hàng tuần, danh sách ngày lễ. Giới hạn 0 là không giới hạn; ngày lễ nhập `YYYY-MM-DD`, mỗi dòng một ngày.
- Cấu hình mới áp dụng khi tạo hoặc sửa đơn, không tự thay đổi số giờ của đơn cũ. Việc kiểm tra giới hạn tính tất cả đơn còn hiệu lực của cùng nhân viên.

## Lọc, thống kê và Excel

Mặc định hiển thị tháng hiện tại theo giờ Việt Nam, đơn mới nhất trước. Hỗ trợ tháng/năm, nhân viên (Admin/trợ lý), trạng thái, loại OT, khoảng ngày và tìm kiếm lý do/báo cáo.

Khoảng ngày được giao với tháng/năm đang chọn. Chọn **Cả năm** để lọc và xuất tổng hợp năm.

- Tổng giờ đăng ký loại bỏ đơn từ chối/đã hủy.
- Chỉ đơn **Hoàn thành** cộng vào giờ xác nhận.
- Đơn qua ngày/tháng được chia thời lượng theo từng ngày; số phút nghỉ, thực tế và xác nhận được phân bổ tỷ lệ theo khoảng đăng ký, làm tròn cộng dồn để bảo toàn tổng số phút.
- Loại OT dựa trên ngày bắt đầu của đơn, ưu tiên ngày lễ rồi ngày nghỉ hàng tuần.
- Trang chính chỉ có một bảng đơn đăng ký; tổng hợp nhân viên và theo tháng nằm trong file Excel.
- **Xuất Excel** xuất toàn bộ kết quả đang lọc (không chỉ trang hiện tại), gồm danh sách OT, tổng hợp nhân viên và tổng hợp tháng. Quyền cá nhân vẫn được kiểm tra tại API.

## Dữ liệu và triển khai

Module dùng đăng nhập và bảng nhân sự hiện tại, kiểm tra trạng thái hoạt động và quyền hiện tại từ kho nhân sự tại API. Vai trò `admin` và `assistant` được xem đơn nhân viên, duyệt/từ chối và xác nhận báo cáo OT. Cấu hình OT chỉ dành cho `admin`.

- `DATA_SOURCE=json`: dữ liệu lưu tại `src/data/json/overtime.json`, ghi file nguyên tử và khóa giữa các tiến trình để kiểm tra trùng giờ cùng lúc. File thuộc volume dữ liệu đang dùng của ứng dụng.
- `DATA_SOURCE=mysql`: chạy `npm run db:migrate` trước khi khởi động phiên bản mới. Migration `020_overtime.sql` tạo `overtime_requests`, `overtime_history`, `overtime_settings`. Mỗi lần thay đổi khóa hàng cấu hình, kiểm tra và ghi đơn cùng lịch sử trong một transaction. Các trường chính có cột và chỉ mục riêng; `record_json` giữ bản ghi đầy đủ, gồm phiên bản và các thông tin bổ sung.
- Mỗi đơn có phiên bản chống thao tác trên dữ liệu cũ. Khi báo đơn đã thay đổi, đóng hộp thoại, tải lại và mở đơn để thao tác tiếp.
- API: `GET/POST/PATCH /api/overtime`, `GET /api/overtime?id=...`, `GET /api/overtime/export`.

Kiểm thử:

```sh
node --test tests/overtime.test.mjs tests/overtime-routes.test.mjs
```

Email nhắc báo cáo, duyệt hàng loạt, tích hợp chấm công và tính lương thuộc giai đoạn mở rộng, chưa triển khai.

## Giao diện đơn giản

Trang danh sách gồm một bảng: STT, nhân viên, ngày làm thêm (kèm lý do), loại làm thêm, giờ đăng ký (kèm khoảng giờ), giờ thực tế, người duyệt (kèm trạng thái), báo cáo và ngày tạo. Menu ba chấm ở cuối dòng chứa các thao tác phù hợp trạng thái và quyền.

Mặc định xem **Đơn của tôi**. Admin/trợ lý chọn **Tất cả nhân viên** để xử lý đơn. Bộ lọc chi tiết thu gọn dưới nút **Bộ lọc**. Thêm mới và sửa đơn mở màn hình form riêng trong module, có mục quy định, thông tin đơn và nút hủy/lưu.

## Thống kê dành cho Admin và trợ lý

Nút **Thống kê** ở đầu trang mở `/overtime/statistics`. Chọn năm, tháng, nhân viên hoặc khoảng ngày để xem tổng giờ đăng ký, giờ xác nhận, số đơn chờ duyệt/chờ xác nhận/hoàn thành, xu hướng tháng, phân bổ loại OT và top 10 nhân sự theo giờ xác nhận. Bảng nhân sự có tìm kiếm, phân trang và bao gồm người chưa có OT trong kỳ. Xuất Excel dùng cùng bộ lọc thời gian/nhân viên. Quyền truy cập được kiểm tra ở cả trang và API `/api/overtime/statistics`; nhân viên thường không được xem thống kê toàn đội.

Bảng OT hiển thị **Số giờ thực tế** theo thời lượng đăng ký đã tính khi chưa khai báo giờ thực tế (ví dụ 18:00–23:00 là 5h00p); khi đã gửi báo cáo, dùng thời gian thực tế đã khai báo. **Lý do** là cột riêng, thay cho cột báo cáo công việc. **Trạng thái** và **Người phê duyệt** tách riêng; tên người xử lý chỉ xuất hiện khi đơn đã được xử lý.
