# Đợt cập nhật Plane theo Module 7 — 21/10/2026

Nguồn: `agenttalk/XMOBILITY_Office.docx`, phần VII; các quyết định giữ cấu trúc Plane ở mục 6 của `agenttalk/agentcoding.md` vẫn áp dụng. AI ban đầu được để lại, sau đó người dùng đã yêu cầu triển khai bằng Gemini; tiến độ mới ở cuối tài liệu. Workload được chốt tính theo số task/người/tuần, ngưỡng cấu hình được.

## Đã triển khai trong đợt này

| Mục | Hành vi |
| --- | --- |
| F0505, UC-S06 | Hoàn thành/mở lại từ List và chi tiết/peek qua state Plane; cảnh báo trước khi hoàn thành task còn con chưa xong; giữ kiểm tra workflow/nghiệm thu của server |
| F0501 | Tạo nhanh giữ nội dung khi lỗi, khóa gửi đồng thời, dọn dòng tạm, xử lý POST đã thành công nhưng tải thống kê/thêm quan hệ thất bại để tránh tạo trùng |
| F0507 | Hiện số con và mũi tên; mở nhiều cấp; một dòng thêm con cho nhánh đang thao tác; sắp xếp anh em cùng cha bằng cùng store trên List và chi tiết; chặn quan hệ cha–con vòng trên server |
| F0502 | Lưu nháp/thu nhỏ đợi kết quả lưu; bản sao cục bộ tách theo tài khoản/workspace/project/task cha; khôi phục khi mở lại; retry dùng cùng draft/task đã tạo |
| F0601–F0603 | Sáu editor custom field hiện có được dùng lại trong form tạo task; task và giá trị được lưu cùng transaction; Draft giữ giá trị và chuyển sang task khi xuất bản; kiểm tra lại quyền project và khóa xuất bản đồng thời để tránh tạo trùng |
| F0512, UC-S06 | Quản lý cộng tác viên từ chi tiết và peek; API chỉ trả người theo dõi thực tế; kiểm tra tài khoản/membership/Guest; người phụ trách cũ trở thành cộng tác viên nếu còn quyền xem |
| F1003 | Kế hoạch cá nhân có bốn nhóm Mới được giao/Hôm nay/Sắp tới/Để sau; lưu riêng theo user và task; chuyển nhóm/sắp xếp, List/Board, xem task hoàn thành; không đổi ngày hoặc thứ tự chung của project |
| F0510, UC-S07 | Chặn dependency vòng và self-link, kiểm tra cả batch và yêu cầu đồng thời; lỗi giữ lựa chọn UI và khôi phục store |
| F0510, UC-S07 | Xem trước xung đột ngày ở các luồng sửa ngày dùng chung; xác nhận giữ ngày hoặc hủy; gợi ý dời task phụ thuộc giữ nguyên thời lượng; không tự sửa task khác |
| F0708 | Workload theo tuần trong Analytics → Tổng quan; task chưa lên lịch riêng; mỗi assignee nhận một lượt đếm trong từng tuần giao nhau với khoảng ngày; Admin đổi ngưỡng theo từng người; Members đọc; dữ liệu giới hạn quyền xem |
| F1001/F0512 | Recipient thông báo và mention được kiểm tra lại quyền hiện tại, gồm tài khoản, workspace, project và chính sách Guest |

## Bằng chứng kiểm tra

- 200 test backend liên quan đã đạt trên PostgreSQL cô lập: custom field, tạo task/Draft với custom field, subscriber, planning, workload, dependency, preview ngày, cây cha–con, đổi assignee, quyền nhận thông báo, nhắc hạn và khoảng ngày.
- 53 test frontend hiện có/mới đã đạt. TypeScript và build embedded đã đạt. Lint các component/helpers mới được kiểm tra không có lỗi.
- Migration `0125_issue_user_plan` và `0126_draft_custom_field_values` được kiểm tra không thiếu thay đổi model; chạy trên bản sao dữ liệu cũ rồi đối chiếu 10 bảng bằng số lượng và SHA-256: khớp.
- Đã sao lưu PostgreSQL trước migration local; migration local cũng giữ nguyên 10 dấu kiểm tra. Đã cập nhật API, worker, beat-worker và web tại localhost; chưa triển khai VPS.
- Chrome với workspace kiểm thử riêng: hoàn thành/mở lại; cảnh báo task cha và Hủy; mở cây sáu cấp; một dòng thêm con; lưu thứ tự subtask; lưu nhóm kế hoạch qua reload; Workload cảnh báo và lưu ngưỡng; kiểm tra màn hình nhỏ không tràn ngang toàn trang; tạo task kèm custom field và kiểm tra lại giá trị qua API; lưu nháp/thu nhỏ giữ custom field; thêm cộng tác viên; cảnh báo xung đột ngày, Hủy không lưu và Giữ ngày mới chỉ sửa task đang thao tác.

## Giới hạn và phần tiếp theo

Không coi toàn bộ P1 hay Module 7 đã hoàn thành.

- Draft hiện khôi phục cục bộ và yêu cầu bấm lưu lại; **chưa tự gửi lại khi có mạng** như UC-S05 E2. Cần cơ chế idempotency bền vững trước khi bổ sung gửi tự động.
- Ngày vẫn dùng model date của Plane: **chưa có giờ cụ thể và task lặp lại**.
- Cần tiếp tục nghiệm thu đầy đủ sửa tên trực tiếp trên List, tìm kiếm comment/người, Inbox và đồng bộ nhiều người/view; các test hiện tại không chứng minh toàn bộ những luồng này.
- Custom field: chưa làm thư viện workspace, formula, mandatory, lọc/sắp xếp/nhóm theo custom field và tích hợp đầy đủ import/export.
- Chưa triển khai: project template, milestone/approval theo BA, tùy chọn nhân bản/thùng rác, dashboard builder, critical path/baseline, Rule builder, Portfolio, Goals, email/push/Drive/Dropbox và kênh trao đổi chung. Quản lý tab đã có ẩn/hiện và mặc định trong Plane; cần kiểm tra lưu lỗi và thứ tự trước khi coi F0707 hoàn tất.
- AI đã được yêu cầu triển khai bằng Gemini (xem mục cập nhật bên dưới). Các khác biệt cấu trúc đã được chấp nhận (Section độc lập, một assignee, multi-homing, task ngoài project, bốn vai trò BA) không bị thay đổi trong đợt này.

Đã dọn workspace/tài khoản/session kiểm thử tạm. Đối chiếu dữ liệu ngoài workspace kiểm thử với bản sao lưu cũng khớp 10 bảng. Cache build cũ đã được dọn và Dockerfile web tách lớp cài dependencies để các lần sửa UI sau dùng lại cache.

Hợp đồng API bổ sung: `docs/plane-collaborators-api.md`, `docs/plane-workload-api.md`, `docs/plane-dependency-dates-api.md`.

## Đối chiếu bổ sung và cập nhật P2 — Tổng quan dự án

Đọc lại trực tiếp phần VII của tài liệu gốc: F0305 là P2; giờ cụ thể thuộc F0504 P1; task lặp lại có F0515 riêng ở P3. F0516 còn có viết mô tả bằng AI ngoài tóm tắt/gợi ý subtask, vẫn để lại toàn bộ theo yêu cầu.

- **F0305:** bổ sung báo cáo trạng thái dự án với năm giá trị On track / At risk / Off track / On hold / Complete, tiêu đề, nội dung, người đăng, thời điểm và lịch sử phân trang. Đây là sức khỏe dự án, không đổi state task hay bỏ qua nghiệm thu.
- **F0306 (một phần):** Tổng quan có mô tả project đang lưu, danh sách thành viên/vai trò Plane, tài liệu HTTP(S), số task/tổng hoàn thành/quá hạn và báo cáo gần nhất. Mốc quan trọng theo BA chưa triển khai.
- **F0302 (ngày dự án):** ngày bắt đầu/kết thúc lưu riêng cho project, cho phép xóa ngày, kiểm tra khoảng ngày; không thay đổi ngày task.
- API đòi membership đang hoạt động cả workspace/project; Admin/Member ghi; Guest chỉ đọc khi project cho xem toàn bộ tính năng; project lưu trữ chỉ đọc. Báo cáo chống tạo trùng theo request UUID, thông tin dự án có revision để chặn ghi đè khi hai người sửa đồng thời.
- UI dùng chung Select/Button Plane, nhãn Anh/Việt, nội dung/tên người/tài liệu giữ nguyên; đọc làm mới 30 giây và khi quay lại cửa sổ. Không tuyên bố WebSocket realtime, email/push hay toàn bộ F0306 hoàn tất.

Hợp đồng: `docs/plane-project-overview-api.md`. Migration `0127_project_overview_status` chỉ tạo hai bảng mới. Bản sao lưu trước cập nhật local: `/tmp/xbus-plane-before-overview-20261021.dump`.

Đã triển khai lên localhost. Đạt 240 test backend (40 test Tổng quan/báo cáo, gồm ghi đồng thời), 55 test frontend, 8 test ngôn ngữ, TypeScript, build Docker và lint phần mới. Migration chạy trên bản sao database thật trước, rồi local; dấu kiểm tra 10 bảng khớp trước/sau và sau dọn fixture. Chrome đã xác nhận đăng báo cáo, lưu ngày/tài liệu, giữ dữ liệu sau reload, đổi Anh/Việt giữ nguyên nội dung người dùng, viewport 390px không tràn ngang và không có lỗi JavaScript trong các bước kiểm tra. Chưa kiểm tra exhaustive mọi menu/role trong trình duyệt; quyền được kiểm tra qua contract test. Chưa triển khai VPS.

## Gemini và quản lý tab — cập nhật theo yêu cầu triển khai tiếp

Người dùng đã cho phép triển khai AI bằng Gemini, thay thế quyết định để lại AI trước đó; yêu cầu dùng cách gọi Google như AI upload menu Trà chiều.

- **F0516:** trợ lý có ở form tạo/Draft (tóm tắt, viết mô tả), chi tiết và peek (thêm gợi ý subtask). Xem trước, chỉnh nội dung, chọn subtask trước khi áp dụng. Mô tả được escape trước khi đưa vào editor; lưu lỗi giữ bản xem trước. Tạo subtask dùng serializer/workflow Plane, cùng transaction và chống tạo trùng theo request UUID, kể cả hai yêu cầu đồng thời. Nhãn và lỗi Anh/Việt; tên/nội dung nhập giữ nguyên.
- Khóa chỉ ở backend; nhập ba biến Gemini từ `.env` sang `plane.env` đang được Git bỏ qua. Gọi Google theo mẫu `src/libs/geminiMenu.js`, schema JSON, thinking low và deadline 95 giây, retry 429/503 tối đa hai lần. Request không tự thay đổi task; cần thao tác áp dụng riêng.
- **Giới hạn gọi thật:** kiểm tra model/key đạt; yêu cầu structured tối thiểu thành công sau 79,7 giây; transport thật tạo được 7 subtask. Tóm tắt và viết mô tả vẫn timeout trong các lần kiểm tra 95 giây. Chưa đánh dấu toàn bộ AI đạt kiểm tra nhà cung cấp. UI/API và lỗi đã được kiểm tra riêng qua mô phỏng HTTP, không gọi kết quả giả là Gemini thật.
- **F0707 (bổ sung):** menu chuột phải ở tab project có chuyển trái/phải, lưu thứ tự/tab mặc định theo người và project; thứ tự cũng áp dụng trên sidebar. Sửa bắt lỗi async ẩn/hiện, khôi phục optimistic state khi lỗi, giữ các thuộc tính thành viên khác. Tab hệ thống có thứ tự/ẩn/hiện/mặc định; thêm tab view tùy ý vẫn chưa triển khai.
- Đạt 256 test backend liên quan, 58 test frontend, 8 test ngôn ngữ, TypeScript và build. Browser: preview AI mô phỏng, tạo subtask/apply mô tả bằng API thật, viewport 390px không tràn ngang; tab order/default giữ qua reload và lỗi lưu giả lập khôi phục thiết lập cũ. Không có lỗi JavaScript trong các luồng này.

Hợp đồng AI: `docs/plane-ai-api.md`. Mô phỏng HTTP: `postman/simulations/gemini.sim.yaml`. Migration `0128_issue_ai_application` tạo bảng chống lặp, đã áp dụng local; sao lưu trước đó `/tmp/xbus-plane-before-ai-20261021.dump`. Các phần còn thiếu trong bảng phía trên vẫn chưa được coi hoàn tất; không tuyên bố đã triển khai full tài liệu.

Sau cập nhật đã dọn workspace/tài khoản/session kiểm thử; 10 dấu dữ liệu local trước/sau vẫn khớp. POST qua API local thực tế đã kiểm tra trả mã `ai_timeout`/HTTP 504 sau 95,2 giây thay vì lỗi chung. Đã giữ nguyên model người dùng chọn, không tự chuyển model khi timeout.
