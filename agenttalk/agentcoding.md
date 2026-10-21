# Đối chiếu Module 7 BA với Quản lý công việc hiện tại

Ngày đối chiếu: 19/10/2026.

## 1. Nguồn và giới hạn đánh giá

- Yêu cầu BA: `agenttalk/XMOBILITY_Office.docx`, phần **VII. MODULE 7 – Quản lý công việc**.
- Hiện trạng: mã nguồn Plane tại `services/plane`, tích hợp XBus tại `src/app/(dashboard)/work/projects`, `src/app/api/work/plane`, `src/libs/planeIntegration.js` và `docs/plane-integration.md`.
- Đây là kết quả đọc source, chưa phải nghiệm thu runtime. Có model, API hoặc component không đồng nghĩa toàn bộ use case đã hoạt động đúng.
- “Chưa thấy” nghĩa là chưa tìm được triển khai tương đương trong phạm vi đã kiểm tra; cần truy vết bổ sung trước khi quyết định xây mới.
- File này thay thế nội dung agentcoding.md trước đây. Không xem các đề xuất trong file là quyết định phạm vi đã được phê duyệt.

## 2. Kết luận

XBus đang nhúng Plane Community Edition, trong khi BA mô tả mô hình gần Asana. Hệ thống có nền tảng quản lý dự án, công việc và cộng tác, nhưng chưa đáp ứng đầy đủ Module 7.

Các khác biệt lớn nằm ở mô hình dữ liệu, phân quyền, Section, task cá nhân, multi-homing và custom field. Không thể xử lý tất cả chỉ bằng đổi nhãn hoặc bổ sung giao diện.

## 3. Khác biệt cấu trúc và nghiệp vụ

| Nội dung | BA yêu cầu | Hiện trạng source | Hệ quả khi triển khai BA |
| --- | --- | --- | --- |
| Phân cấp | Team → Project → Section → Task; Portfolio và Goal liên kết project | Workspace → Project → Work item; có State, Cycle, Module | Cần xác định Team, Portfolio, Goal là đối tượng mới hay điều chỉnh BA |
| Section | Nhóm task độc lập với trạng thái hoàn thành | State biểu diễn giai đoạn/trạng thái | State không tương đương hoàn toàn Section; nếu giữ BA cần tách hai khái niệm |
| Trạng thái task | Chưa hoàn thành / Hoàn thành; quá hạn và bị chặn là cờ tính toán | State group gồm backlog, unstarted, started, completed, cancelled | Cần quy tắc ánh xạ hoặc thay đổi vòng đời |
| Assignee — F0503 | Một người hoặc để trống | Quan hệ nhiều assignee | Cần chốt giữ nhiều người hay giới hạn một người, kể cả dữ liệu cũ |
| Task ngoài project — F0502, UC-S05 | Task hợp lệ không thuộc project, xuất hiện trong My tasks | Có draft; work item chính gắn project | Draft không thay thế task cá nhân hoàn chỉnh |
| Multi-homing — F0509 | Một task thuộc nhiều project, mỗi project một section | Work item chính có một project | Cần thay đổi quan hệ, quyền xem và cách tổ chức task |
| Quyền project — F0304 | Admin / Editor / Commenter / Viewer | Admin / Member / Guest | Cần sửa quyền backend và UI nếu giữ đúng bốn vai trò BA |
| Quyền xem task | Kế thừa từ mọi project; assignee/collaborator luôn xem được task của mình | Chưa chứng minh có đúng cơ chế này; quyền hiện tại dựa trên Plane | Phải thiết kế rõ trước khi mở task ngoài project hoặc multi-homing |
| Đăng nhập — UC-S01 | Đăng nhập riêng, chọn workspace, khóa khi sai mật khẩu, trial/billing | XBus cấp ticket vào workspace xbus-office | Cần xác nhận các luồng BA nào áp dụng cho hệ thống nội bộ |
| Lời mời — UC-S02 | Email ngoài tổ chức tự thành Guest, lời mời hết hạn 14 ngày | Nhân sự được đồng bộ từ XBus | Cần chốt có cho phép người ngoài và quy tắc vòng đời tài khoản |

Bằng chứng chính:

- `services/plane/apps/api/plane/db/models/project.py`: Project, ProjectBaseModel, vai trò Admin/Member/Guest, Public/Secret.
- `services/plane/apps/api/plane/db/models/issue.py`: parent, nhiều assignee, ngày, completed_at, blocker/relation, subscriber, reaction.
- `docs/plane-integration.md`: Plane CE, identity bridge, workspace, ticket, embedded mode và đồng bộ nhân sự.

## 4. Khoảng thiếu so với BA

| Nhóm | Mã/tham chiếu BA | Kết quả đọc source |
| --- | --- | --- |
| Team | Phân cấp dữ liệu, UC-S03 | Chưa thấy lớp Team chứa project với ba cơ chế tham gia như BA |
| Section | F0401–F0404 | Chưa có Section độc lập tương đương; chưa thấy đủ luồng xóa/chuyển task và SUM/AVG/MIN/MAX/COUNT |
| Custom field | F0601–F0606 | Đã bổ sung F0601–F0603: sáu kiểu trường theo Project, quản lý lựa chọn, cột List và giá trị trên chi tiết. Thư viện workspace, formula và mandatory vẫn là GAP P2/P3 |
| Trạng thái sức khỏe project | F0305, UC-S14 | Chưa thấy bộ On track / At risk / Off track / On hold / Complete kèm báo cáo công bố |
| Template project | F0309 | Chưa thấy lưu cả section, task mẫu, custom field, Rule và ngày tương đối |
| Milestone/Approval | F0511 | Có model IssueType nhưng chưa chứng minh luồng milestone và phê duyệt/từ chối/yêu cầu sửa như BA |
| Task lặp lại | F0515 | Chưa thấy cơ chế lịch lặp và tạo bản mới sau khi hoàn thành |
| Rule tùy biến | Mô hình Rule, F0307 | Automation hiện thấy là tự đóng/tự lưu trữ; chưa phải builder trigger → điều kiện → hành động |
| AI | F0516 | Chưa chứng minh luồng đầy đủ tóm tắt, gợi ý subtask và viết mô tả |
| Portfolio | F1201 | Chưa thấy module tương đương |
| Goals | F1202 | Chưa thấy mục tiêu có chỉ số và tự cập nhật từ project |
| Workload | F0708 | Chưa thấy tải theo người/tuần và cảnh báo quá tải |
| Tin nhắn chung | F0906 | Chưa thấy kênh project/team độc lập với task |

Automation hiện tại có thể kiểm tra tại:

- `services/plane/apps/web/app/(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/automations/page.tsx`.
- `services/plane/apps/api/plane/bgtasks/issue_automation_task.py`.

## 5. Có nền tảng nhưng chưa đủ bằng chứng đáp ứng toàn bộ BA

| Chức năng | Hiện trạng và phần cần kiểm chứng |
| --- | --- |
| Project | Có model/UI; cần đối chiếu ngày bắt đầu–kết thúc, overview, nhân bản và tùy chọn sao chép |
| Task | Có model cho nội dung, assignee, state, ngày, nhãn; cần kiểm tra tạo nhanh liên tiếp, autosave và validation |
| Draft | Có source; cần kiểm tra thu nhỏ giữ nháp, xác nhận hủy, lưu offline và tự gửi lại |
| Subtask — F0507 | Có parent–child; cần kiểm tra nhiều cấp, sắp xếp, chuyển thành task độc lập và cảnh báo khi hoàn thành cha |
| Dependency — F0510 | Có blocker/relation; cần kiểm tra chống vòng, cảnh báo xung đột ngày, gợi ý dời ngày và thông báo gỡ chặn |
| Ngày — F0504 | Model dùng ngày; chưa chứng minh giờ cụ thể và lặp lại theo BA |
| List/Board/Calendar/Gantt | Có component/store; cần nghiệm thu chỉnh ô, kéo thả, đổi ngày, resize và đồng bộ giữa view |
| Gantt nâng cao — F0705 | Chưa chứng minh milestone, critical path và baseline |
| Dashboard — F0706 | Có analytics; chưa chứng minh builder biểu đồ theo nguồn, nhóm, bộ lọc và custom field |
| View — F0707 | Có View và cấu hình hiển thị; chưa xác nhận thêm/ẩn/sắp xếp tab đúng mô tả BA |
| Search — F0801 | Có tìm project/work item và đối tượng khác; chưa xác nhận bao phủ người và nội dung comment |
| Filter/Sort/Group — F0802–F0807 | Có nền tảng; thiếu phần phụ thuộc custom field, cần kiểm tra lưu mặc định và lưu bộ lọc |
| Comment/mention/activity/reaction | Có model/source; cần kiểm tra mention tự thêm collaborator, quyền chia sẻ và phạm vi thông báo |
| Attachment — F0903 | Có asset/upload; chưa xác nhận chọn từ Drive/Dropbox và preview ảnh/PDF đầy đủ |
| Inbox/cài đặt thông báo | Có source; cần kiểm tra từng sự kiện, đã đọc, lưu trữ, email/push và digest |
| My tasks — F1003 | Có nền tảng công việc cá nhân; chưa xác nhận nhóm Recently assigned/Today/Upcoming/Later và kéo thả lên kế hoạch |
| Home — F1004 | Có component; cần kiểm tra đủ lời chào, hạn sắp tới, project gần đây và cộng tác viên |
| Nhắc hạn — F1005 | Chưa chứng minh lịch chạy trước hạn một ngày và khi quá hạn |
| Xóa/khôi phục — F0308, F0514 | Có archive/soft-delete và job hard-delete; cấu hình mặc định HARD_DELETE_AFTER_DAYS là 60, chưa chứng minh khôi phục trong 30 ngày đúng BA |
| Import/export — F1204–F1205 | Có importer/exporter; cần kiểm tra CSV mapping, custom field và in/PDF |
| Báo cáo xuyên project — F1203 | Có nền tảng analytics; chưa chứng minh dashboard tổng hợp đúng BA |
| Tích hợp — F1206 | Có REST API, webhook và một số model integration; chưa nghiệm thu đủ Slack/email/lịch/Drive |

## 6. Quyết định triển khai đã chốt và phạm vi còn lại

Người dùng đã chọn **giữ cấu trúc Plane, làm UI và chức năng theo BA**. Quyết định này thay thế câu hỏi lựa chọn kiến trúc trước đây:

- Giữ Workspace → Project → Work item; không xây thêm hệ task riêng trong XBus.
- List/Board tiếp tục nhóm theo State và các thuộc tính Plane. Không tạo Section độc lập chỉ để giống tên gọi BA.
- Giữ nhiều assignee và quyền Admin/Member/Guest; không ép một assignee hoặc thêm bốn vai trò chỉ ở UI.
- Work item chính tiếp tục thuộc một Project. Không triển khai task cá nhân ngoài Project hoặc multi-homing trong đợt P1 này.
- Giữ đăng nhập và đồng bộ nhân sự XBus → Plane, bảo toàn dữ liệu hiện có.
- Bổ sung custom field trực tiếp vào model/API/UI Plane, trước mắt theo Project (F0601–F0603). Thư viện workspace, formula và mandatory thuộc các đợt sau.

Các chi tiết cần xác định khi tới phạm vi tương ứng: lịch lặp/giờ cụ thể, khôi phục/thùng rác, khách bên ngoài, Drive/Dropbox, email/push và AI. Các mục này không chặn việc triển khai chức năng độc lập đã được đồng ý.

## 7. Đề xuất trình tự triển khai sau khi chốt phạm vi

1. Chốt mô hình dữ liệu và ma trận quyền trước khi sửa UI.
2. Lập ma trận từng F/UC: yêu cầu → model → API/permission → service/store → UI → bằng chứng test/runtime.
3. Nghiệm thu lại các chức năng đã có để tránh xây trùng.
4. Ưu tiên GAP P1 đã được xác nhận, đặc biệt custom field, Section, quyền, task cá nhân và nhắc hạn.
5. Tách P2/P3 thành các đợt riêng với tiêu chí nghiệm thu rõ ràng.
6. Thiết kế migration và rollback trước mọi thay đổi cấu trúc hoặc dữ liệu hiện có.

Không gán tỷ lệ hoàn thành khi chưa có ma trận nghiệm thu. Không tuyên bố tính năng hoạt động chỉ dựa trên tên route, model hoặc component.


## 8. Phạm vi đã được đồng ý và tiến độ triển khai

Người dùng đã đồng ý hướng: tiếp tục mở rộng Plane, triển khai P1 trước và bảo toàn dữ liệu hiện có. Người dùng đã chốt tiếp tục dùng cấu trúc Plane; UI và chức năng được bổ sung theo mục tiêu BA trên cấu trúc này.

Đợt đầu đã triển khai trong source:

- F1005: tác vụ nhắc trước hạn một ngày và khi quá hạn, Inbox, chống gửi trùng, kiểm tra tài khoản và membership; migration bổ sung không thay đổi dữ liệu công việc.
- UC-S06 E1: kiểm tra khoảng ngày khi PATCH riêng ngày bắt đầu hoặc hạn hoàn thành ở cả API ứng dụng và REST API.
- Đã đạt: 46 test backend trên Django/PostgreSQL (28 test nhắc hạn/Inbox, 18 test khoảng ngày), 7 test tiếng Việt, type check frontend và build embedded. Chưa nghiệm thu thao tác trực tiếp trong trình duyệt và chưa deploy.
- Đã đạt kiểm tra migration không thiếu thay đổi model, áp dụng toàn bộ migration trên PostgreSQL trống, Django system check và đăng ký tác vụ Celery. Chưa chạy migration trên dữ liệu hiện có.

Không coi toàn bộ P1 đã hoàn thành chỉ vì đã có phần nhắc hạn hoặc custom field; các mục khác vẫn cần đối chiếu và nghiệm thu theo cấu trúc Plane đã chốt. Hướng dẫn vận hành phần nhắc hạn nằm trong `docs/plane-integration.md`.


## 9. Đợt tiếp theo — Custom field theo cấu trúc Plane

Đã bổ sung trong source:

- `IssueCustomField`, `IssueCustomFieldValue` và migration `0124_issue_custom_fields`; dữ liệu gắn trực tiếp Project/Issue Plane.
- Sáu kiểu: text, number, date, single-select, multi-select, people. Số có định dạng thường, phần trăm, tiền VND.
- Tạo/đổi tên/ẩn trường; thêm/đổi tên/đổi màu/đổi thứ tự/ẩn lựa chọn. Giữ ID và giá trị cũ; không đổi kiểu trường để tránh diễn giải sai dữ liệu.
- Nút thêm trường trong tiêu đề bảng List; các cột tùy chỉnh và sửa trực tiếp trên ô. Chi tiết công việc dùng chung dữ liệu/store với List.
- API kiểm tra membership đang hoạt động, vai trò Plane, phạm vi project/issue và quyền Guest theo chính sách xem công việc của Plane.
- Cập nhật giá trị có validation theo kiểu, transaction, lịch sử và thông báo trong ứng dụng cho assignee/subscriber đủ quyền.
- Có API tải giá trị theo lô, tránh một request cho từng ô; frontend làm mới định kỳ 30 giây. Chưa phải đồng bộ realtime bằng WebSocket.

Chưa bao gồm: thư viện trường xuyên project, formula, mandatory, lọc/sắp xếp/nhóm theo custom field, đưa giá trị custom field vào form tạo task và import/export. Không đánh dấu các mục đó đã đáp ứng BA.

Đã đạt: 80 test backend liên quan (34 custom field + 46 nhắc hạn/khoảng ngày), 10 test helper/store frontend, 7 test tiếng Việt; kiểm tra Chrome với dữ liệu giả cho tạo trường, sửa trực tiếp, chọn nhiều và mobile không tràn ngang. Migration 0124 đã được áp dụng trên PostgreSQL thử có project/task/assignee/history cũ và xác nhận các dữ liệu đó còn nguyên. Kiểm tra Chrome bổ sung: đóng bằng Escape vẫn lưu; giả lập lỗi lưu giữ ô mở và hiển thị lỗi, Hủy giữ nguyên dữ liệu đã lưu. Type check và build embedded cuối đã đạt; lint các file mới đạt 0 cảnh báo/0 lỗi, Ruff backend đạt. Preview không phải nghiệm thu trên tài khoản và dữ liệu production; chưa deploy.

## 10. Cập nhật core P1 và các luồng liên quan — 21/10/2026

Đã bổ sung hoàn thành/mở lại và cảnh báo subtask; cây subtask nhiều cấp/sắp xếp; tạo nhanh và Draft an toàn hơn khi lỗi; custom field trong form tạo; cộng tác viên; kế hoạch cá nhân; kiểm tra dependency; Workload theo số task/người/tuần với ngưỡng cấu hình. Dùng cùng model/store và các component Plane hiện có để giữ nhất quán List, chi tiết và peek.

200 test backend và 53 test frontend liên quan đạt; TypeScript và build embedded đạt. Migration 0125–0126 đã kiểm tra trên bản sao dữ liệu cũ và áp dụng local với dấu kiểm tra 10 bảng giữ nguyên. Đã cập nhật backend/web/worker tại localhost; chưa deploy VPS. Các ghi chú “chưa deploy” ở mục 8–9 mô tả thời điểm kiểm tra trước, không phải trạng thái localhost sau đợt này.

Danh sách hành vi, bằng chứng và giới hạn còn lại nằm trong [plane-update-status.md](plane-update-status.md). Không đánh dấu toàn bộ P1/Module 7 hoàn tất. Người dùng chọn tiếp tục P2/P3 sau kiểm tra P1; AI để lại, Workload dùng số task/người/tuần.

## 11. P2 — Tổng quan dự án và báo cáo trạng thái

Đã đối chiếu lại phần VII bản DOCX và bổ sung F0305 (báo cáo sức khỏe dự án với 5 trạng thái, lịch sử, chống đăng trùng), ngày dự án trong F0302 và một phần F0306 (mô tả hiện có, thành viên/vai trò Plane, tài liệu liên kết, thống kê task). Tổng quan có trong sidebar và tab project, UI Anh/Việt giữ nguyên dữ liệu người dùng. Không tự hoàn thành task khi báo cáo project Complete; mốc BA trong F0306 còn thiếu. Chi tiết API, kiểm tra và phạm vi còn lại được cập nhật ở `plane-update-status.md`, `docs/plane-project-overview-api.md`. Migration 0127 đã kiểm tra trên bản sao và local giữ nguyên 10 dấu dữ liệu; localhost đã chạy bản mới, chưa triển khai VPS.

## 12. AI Gemini và thứ tự tab

Người dùng đã yêu cầu triển khai AI bằng Gemini, gọi Google theo cách AI upload menu Trà chiều; quyết định này thay thế việc để lại AI trước đó. Đã bổ sung trợ lý tóm tắt/viết mô tả/gợi ý subtask, xem trước và chọn áp dụng; chống tạo subtask trùng và giữ kiểm tra quyền/workflow Plane. Đã bổ sung sắp xếp tab hệ thống theo người/project và sửa xử lý lỗi lưu tùy chọn tab. UI Anh/Việt, nội dung người dùng giữ nguyên. Bản local đã cập nhật; 256 test backend, 58 test frontend, 8 test ngôn ngữ và build/type/lint liên quan đạt. Gemini thật tạo được 7 subtask; tóm tắt/viết mô tả vẫn timeout 95 giây trong kiểm tra, chưa coi toàn bộ F0516 đạt nhà cung cấp. Giới hạn còn lại và bằng chứng nằm ở `plane-update-status.md`, hợp đồng ở `docs/plane-ai-api.md`. Không coi toàn bộ tài liệu đã triển khai xong.
