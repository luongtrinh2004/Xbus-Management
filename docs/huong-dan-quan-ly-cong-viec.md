# Hướng dẫn sử dụng Quản lý công việc

Tài liệu này hướng dẫn tạo dự án, chọn mẫu phù hợp, giao việc và theo dõi tiến độ trong XBus Management.

## Bắt đầu nhanh

Luồng sử dụng chung:

```text
Quản lý công việc
→ Dự án
→ Bắt đầu dự án mới
→ Chọn cách tạo dự án
→ Thiết lập dự án và thành viên
→ Tạo, giao và theo dõi công việc
```

Mỗi dự án là một mục tiêu hoặc một luồng công việc. Mỗi công việc nên có một người phụ trách chính, mô tả rõ ràng và hạn hoàn thành nếu cần theo dõi tiến độ.

## Tạo dự án mới

Tại trang **Dự án**, chọn **Bắt đầu dự án mới**. Có ba cách tạo dự án.

### Dự án trống

Dùng khi muốn tự thiết kế quy trình. Hệ thống tạo ba nhóm cơ bản:

```text
Việc cần làm → Đang thực hiện → Hoàn thành
```

Phù hợp với các dự án đơn giản hoặc quy trình mới chưa có mẫu.

### Dùng mẫu dự án

Dùng khi dự án tương ứng với quy trình quen thuộc, chẳng hạn sprint phần mềm, theo dõi lỗi hoặc vận hành XBus. Mẫu tạo sẵn các nhóm công việc và một vài công việc minh họa; có thể sửa, thêm hoặc xóa sau khi tạo.

### Nhập tệp CSV

Dùng khi đã có danh sách việc trên Excel hoặc Google Sheets. Tệp CSV tối đa 2 MB có thể bao gồm các cột phổ biến như:

```text
Tiêu đề | Mô tả | Nhóm/Trạng thái | Người phụ trách | Ưu tiên | Ngày bắt đầu | Hạn hoàn thành
```

Sau khi nhập, kiểm tra lại danh sách nhóm, người phụ trách và các công việc trước khi tạo dự án.

## Thiết lập dự án

Khi đi qua các bước tạo dự án, hãy thực hiện theo thứ tự sau:

1. Nhập tên, mã dự án, mô tả và thời gian dự kiến.
2. Chọn quyền riêng tư: **Công khai** để người dùng trong hệ thống có thể xem; **Riêng tư** để chỉ thành viên dự án truy cập.
3. Kiểm tra các nhóm công việc/cột trạng thái.
4. Thêm thành viên. Người tạo là chủ dự án; thành viên có thể là **Biên tập** hoặc **Thành viên**.
5. Xem lại rồi chọn **Tạo dự án**.

Quyền cơ bản:

- **Chủ dự án / Quản trị viên**: quản lý dự án, thành viên và toàn bộ công việc.
- **Biên tập**: tạo và cập nhật công việc trong dự án.
- **Thành viên**: xem dự án; cập nhật trạng thái công việc được giao cho mình.

## Chọn mẫu dự án

Các tab trong thư viện mẫu chỉ để lọc theo mục đích. Chúng không tạo ra các tính năng khác nhau; mỗi mẫu khác nhau ở các cột trạng thái và công việc gợi ý.

### Agile & Kanban

Dùng cho đội làm việc theo chu kỳ hoặc theo luồng liên tục.

- **Dự án cơ bản** — `Việc cần làm → Đang thực hiện → Hoàn thành`.
  Dùng cho công việc nhóm đơn giản.
- **Sprint phần mềm** — `Backlog → Sẵn sàng → Đang thực hiện → Kiểm thử → Hoàn thành`.
  Dùng cho đội kỹ thuật làm theo sprint 1–2 tuần.
- **Sprint Backlog** — `Product backlog → Sẵn sàng cho sprint → Đang thực hiện → Kiểm thử → Sprint hoàn thành`.
  Dùng khi cần chọn việc cho sprint, theo dõi thực hiện và chuẩn bị demo cuối sprint.
- **Kanban** — `Cần làm → Đang làm → Chờ duyệt → Hoàn thành`.
  Dùng cho việc phát sinh liên tục như nội dung, thiết kế, hỗ trợ hoặc việc nội bộ.

Sprint có mốc bắt đầu/kết thúc rõ ràng. Kanban là luồng liên tục: hoàn thành một việc thì nhận việc tiếp theo.

### Kỹ thuật

Dùng cho lập trình, QA và hạ tầng.

- **Theo dõi lỗi** — `Lỗi mới → Đã xác nhận → Đang sửa → Chờ kiểm thử → Đã đóng`.
  Dùng để quản lý lỗi phần mềm từ báo cáo đến xác nhận đã sửa.
- **Duyệt mã nguồn** — `Chờ review → Đang review → Cần chỉnh sửa → Đã gộp`.
  Mỗi công việc thường tương ứng một pull request hoặc hạng mục cần review.
- **Nợ kỹ thuật** — `Đã nhận diện → Đang ưu tiên → Đang xử lý → Xác nhận hoàn tất`.
  Dùng cho refactor, tối ưu hiệu năng, nâng cấp thư viện hoặc xử lý code cũ.

### Sản phẩm

Dùng cho phát triển sản phẩm, truyền thông và tài liệu.

- **Chiến dịch** — `Ý tưởng → Chuẩn bị → Đang chạy → Hoàn tất`.
  Dùng cho chiến dịch truyền thông, ra mắt tính năng hoặc tuyển dụng.
- **Yêu cầu tính năng** — `Ý tưởng → Đang cân nhắc → Đã lên kế hoạch → Đang phát triển → Đã phát hành`.
  Dùng để thu thập, đánh giá và theo dõi yêu cầu từ người dùng.
- **Hàng đợi tài liệu** — `Cần viết → Đang viết → Chờ duyệt → Đã xuất bản`.
  Dùng cho tài liệu hướng dẫn, tài liệu API và quy trình nội bộ.

### Vận hành

Dùng cho đầu việc có quy trình, hạn xử lý hoặc cần phản hồi nhanh.

- **Lịch triển khai** — `Chuẩn bị → Đang triển khai → Kiểm tra sau triển khai → Hoàn tất`.
  Dùng khi phát hành hệ thống, cập nhật server hoặc bảo trì.
- **Xử lý sự cố** — `Tiếp nhận → Xử lý khẩn cấp → Phân tích nguyên nhân → Hành động phòng ngừa → Đã đóng sự cố`.
  Dùng cho lỗi production hoặc sự cố nghiêm trọng.
- **Phiếu hỗ trợ** — `Phiếu mới → Đang xử lý → Chờ phản hồi → Đã giải quyết`.
  Dùng để xử lý yêu cầu từ nhân viên hoặc khách hàng.

### XBus

Mẫu phục vụ công việc nội bộ của XBus.

- **XBus Vận hành** — `Cần xử lý → Đang xử lý → Chờ xác nhận → Hoàn thành`.
  Dùng cho trực ca, đối soát, báo cáo đầu ngày và xử lý sự cố tuyến.
- **XBus Sự kiện** — `Ý tưởng sự kiện → Chuẩn bị → Đang diễn ra → Tổng kết → Đã hoàn tất`.
  Dùng cho workshop, outing và các sự kiện nội bộ.

### Chọn mẫu nhanh

| Nhu cầu | Mẫu phù hợp |
| --- | --- |
| Việc nhóm đơn giản | Dự án cơ bản |
| Lập trình theo đợt | Sprint phần mềm hoặc Sprint Backlog |
| Việc phát sinh liên tục | Kanban |
| Theo dõi lỗi | Theo dõi lỗi |
| Duyệt pull request | Duyệt mã nguồn |
| Nhận yêu cầu tính năng | Yêu cầu tính năng |
| Chạy chiến dịch | Chiến dịch |
| Release hoặc bảo trì | Lịch triển khai |
| Sự cố khẩn cấp | Xử lý sự cố |
| Vận hành hằng ngày của đội | XBus Vận hành |
| Tổ chức sự kiện | XBus Sự kiện |

## Làm việc trong dự án

Mặc định dự án mở ở tab **Danh sách** để tập trung vào việc cần làm.

### Danh sách

Phù hợp để tạo, tìm, lọc và xem toàn bộ công việc theo từng nhóm. Có thể:

- Tìm theo tên hoặc mã công việc.
- Lọc theo người phụ trách.
- Sắp xếp theo nhóm, hạn hoàn thành hoặc mức ưu tiên.
- Chọn **Thêm công việc** để tạo đầu việc mới.

### Bảng

Phù hợp khi muốn thấy trạng thái trực quan. Mỗi cột là một nhóm công việc; kéo thả thẻ sang cột khác để chuyển trạng thái nếu có quyền cập nhật.

### Dòng thời gian

Phù hợp để nhìn lịch trình tổng thể dựa trên ngày bắt đầu và hạn hoàn thành.

### Lịch

Phù hợp để kiểm tra việc đến hạn theo tháng.

### Tổng quan

Hiển thị tiến độ, công việc quá hạn, việc chưa giao, tình trạng dự án, thành viên và hoạt động gần đây.

## Tạo và cập nhật công việc

Khi tạo công việc, điền tối thiểu:

1. **Tiêu đề**: nêu rõ kết quả cần đạt, ví dụ “Gửi báo cáo vận hành tuần 40”.
2. **Nhóm công việc**: xác định trạng thái ban đầu.
3. **Người phụ trách**: chọn một người chịu trách nhiệm chính.
4. **Ưu tiên**: Thấp, Trung bình, Cao hoặc Khẩn cấp.
5. **Hạn hoàn thành**: dùng để theo dõi việc sắp đến hạn hoặc quá hạn.

Bấm vào một công việc để mở ngăn chi tiết bên phải. Tại đây có thể cập nhật mô tả, trạng thái, người phụ trách, ngày bắt đầu, hạn hoàn thành, việc con, hoạt động và bình luận.

## Công việc của tôi

Trang **Công việc của tôi** tập hợp những việc đang giao cho tài khoản hiện tại. Dùng trang này mỗi ngày để:

- Xem các việc đang mở.
- Nhận biết việc quá hạn qua nhãn cảnh báo.
- Đánh dấu hoàn thành khi xong.
- Mở dự án gốc để xem bối cảnh, bình luận và các việc liên quan.

## Nguyên tắc làm việc đề xuất

- Một dự án tương ứng một mục tiêu hoặc quy trình rõ ràng.
- Một công việc chỉ nên có một người phụ trách chính.
- Dùng việc con cho các bước nhỏ cần hoàn tất.
- Luôn ghi hạn hoàn thành cho việc quan trọng.
- Cập nhật trạng thái ngay khi bắt đầu, bị chặn hoặc hoàn thành.
- Trao đổi trong phần bình luận của công việc để cả đội có cùng bối cảnh.
