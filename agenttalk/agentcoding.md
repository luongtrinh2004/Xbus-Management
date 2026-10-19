# AGENT CODING — Đối chiếu yêu cầu Quản lý công việc với source XBus/Plane

> Tài liệu này dành cho coding agent làm việc trong `/Users/aiot/Code/xbus-management`.
> Nguồn yêu cầu nghiệp vụ: `agenttalk/XMOBILITY_Office (1).md`, đặc biệt từ dòng/module **VII. MODULE 7 – Quản lý công việc**.
> Nguồn sự thật kỹ thuật: source hiện tại trong `services/plane`, lớp tích hợp XBus trong `src/app/(dashboard)/work`, `src/app/api/work/plane`, `src/libs/planeIntegration.js` và `docs/plane-integration.md`.

---

## 1. Kết luận quan trọng trước khi coding

Phần **Quản lý công việc đã thay đổi kiến trúc căn bản** so với mô tả BA trong `XMOBILITY_Office (1).md`:

- Không tiếp tục xây một hệ thống quản lý task riêng hoàn toàn bằng Next.js/XBus.
- `/work/projects` hiện nhúng **Plane Community Edition** đã được vendor tại `services/plane`.
- Plane là ứng dụng độc lập gồm frontend, API, realtime service và database riêng.
- XBus chịu trách nhiệm xác thực nhân sự, kiểm tra tài khoản hoạt động, đồng bộ hồ sơ công việc và cấp vé đăng nhập Plane.
- Các chức năng Project, Work item, State, Cycle, Module, View, Page, Intake, Comment, Attachment, Activity… phải ưu tiên sử dụng model/API/service sẵn có của Plane.
- Không được tạo thêm một database task song song trong XBus nếu Plane đã có model tương ứng.

Vì vậy, Module 7 trong tài liệu BA phải được hiểu là **yêu cầu sản phẩm**, không phải đặc tả kỹ thuật chính xác của source hiện tại.

---

## 2. Kiến trúc thực tế hiện tại

```text
Người dùng
   │
   ▼
XBus Office /work/projects
   │
   ├─ NextAuth/Google Workspace
   ├─ kiểm tra lại user trong XBus đang active
   ├─ đồng bộ hồ sơ công việc sang Plane
   └─ cấp ticket 60 giây, dùng một lần
           │ POST
           ▼
Plane /auth/xbus/
   │
   ├─ Workspace: xbus-office
   ├─ Project
   ├─ Work item/Issue
   ├─ State, Cycle, Module, Label
   ├─ Comment, Attachment, Activity
   ├─ View, Page, Intake, Archive
   └─ API + realtime riêng
```

### 2.1. Source chính

- `services/plane`: source Plane Community Edition được vendor trực tiếp, giấy phép AGPL-3.0.
- `src/app/(dashboard)/work/projects/page.jsx`: container iframe Plane, tự xin ticket và submit bằng POST.
- `src/app/api/work/plane/session/route.js`: endpoint tạo phiên Plane từ XBus.
- `src/libs/planeIntegration.js`: ánh xạ và đồng bộ nhân sự.
- `src/libs/planeActivity.js`: lấy activity log từ Plane về XBus.
- `docs/plane-integration.md`: tài liệu vận hành và kiến trúc tích hợp.
- `services/plane-xbus/nginx.module.conf`: định tuyến Plane và giữ lại route XBus.
- `docker-compose.plane.override.yml`, `plane.env`: runtime Plane.

### 2.2. Quy tắc tích hợp đã có trong source

- Workspace mặc định: `xbus-office`.
- Admin XBus được ánh xạ thành workspace Admin.
- Assistant/User XBus được ánh xạ thành Member, không phải Admin.
- User disabled hoặc bị loại khỏi danh sách không được tiếp tục truy cập Plane.
- Tài khoản Plane do XBus tạo không có mật khẩu riêng.
- Chỉ đồng bộ dữ liệu phục vụ công việc:
  - ID nhân sự.
  - Họ tên.
  - Email.
  - Mã nhân sự.
  - Phòng ban.
  - Hình thức làm việc.
  - Chức danh.
  - Avatar.
- Không đồng bộ mật khẩu, CCCD, địa chỉ, ngày sinh hoặc dữ liệu tài chính.
- Ticket đăng nhập tồn tại 60 giây, dùng một lần và được gửi bằng POST.
- Giao diện nhúng dùng `VITE_XBUS_EMBEDDED=true`.
- Ngôn ngữ chuẩn của module là `vi-VN`.

---

## 3. Những điểm Module 7 cần thay đổi so với tài liệu BA

| Nội dung trong tài liệu BA | Source hiện tại | Điều chỉnh bắt buộc |
| --- | --- | --- |
| Người dùng đăng nhập Plane bằng email/mật khẩu hoặc Google | Người dùng đăng nhập XBus; XBus cấp one-time ticket sang Plane | Bỏ UC đăng nhập Plane trực tiếp, quên mật khẩu Plane, khóa sai mật khẩu và chọn workspace tự do |
| Có nhiều workspace và mở workspace dùng gần nhất | XBus chủ động đưa user vào workspace `xbus-office` | Không thiết kế workspace switcher trong phạm vi XBus hiện tại |
| Team là lớp chứa Project | Plane CE hiện tổ chức theo Workspace → Project | Không tự tạo model Team mới nếu chưa có yêu cầu riêng đã được duyệt |
| Section là model chứa task | Plane dùng **State** để biểu diễn trạng thái/giai đoạn; còn Cycle và Module là các lớp tổ chức bổ sung | Thay đặc tả Section bằng State/State group; không tạo bảng Section song song |
| Task chỉ có Chưa hoàn thành/Hoàn thành | Plane có State group: backlog, unstarted, started, completed, cancelled | Dùng vòng đời State của Plane, không ép về mô hình nhị phân kiểu Asana |
| Một task chỉ có một assignee | Source Plane dùng `assignee_ids: string[]` | Đặc tả và UI phải hỗ trợ nhiều người phụ trách khi Plane cho phép |
| Project role gồm Admin/Editor/Commenter/Viewer | Source backend Plane dùng Admin/Member/Guest; frontend project type chủ yếu Admin/Member | Không tự thêm bốn vai trò chỉ ở UI; muốn thêm phải sửa đồng bộ model, permission API, service và test |
| Project public/private theo kiểu Asana | Plane model dùng `ProjectNetwork.SECRET = 0`, `PUBLIC = 2` | Dùng network hiện có của Plane |
| Task thuộc nhiều Project (multi-homing) | Kiểu dữ liệu Plane có một `project_id`; chưa có bằng chứng source hiện tại hỗ trợ multi-homing | Đánh dấu multi-homing là GAP/ngoài phạm vi, không tuyên bố đã có |
| Task độc lập ngoài Project là chức năng hoàn chỉnh | Plane có DraftIssue cho draft và một số kiểu dữ liệu cho phép project rỗng; luồng Work item chính vẫn tổ chức trong Project | Chỉ ghi nhận khi đã kiểm chứng route/API cụ thể; không mặc định giống Asana My Tasks |
| Subtask lồng vô hạn | Plane dùng `parent_id`; UI hiện có logic lọc root issues | Chỉ cam kết parent-child theo khả năng source/test; không cam kết vô hạn nếu chưa kiểm chứng |
| Timeline/Gantt dependency giống Asana | Plane có Gantt/timeline framework nhưng dependency và critical path cần kiểm chứng theo edition/feature flag | Phân biệt rõ tính năng đã chạy trong CE với tính năng tài liệu mong muốn |
| Portfolio, Goal, Workload, Automation Rule, AI | Có thể thuộc edition/tính năng khác hoặc chưa bật trong CE hiện tại | Đánh dấu GAP; không code giả bằng frontend tĩnh |
| Billing/trial và “Add billing info” | XBus dùng Plane self-hosted Community Edition | Loại khỏi use case XBus nội bộ |
| Mời email ngoài tổ chức/Guest tự do | XBus đồng bộ nhân sự nội bộ và tránh nhận nhầm email | Mọi flow mời ngoài danh sách nhân sự phải được duyệt riêng về bảo mật |
| Khôi phục sau 30 ngày | Plane có archive/soft-delete ở nhiều model nhưng thời gian 30 ngày chưa được chứng minh | Không hard-code cam kết 30 ngày nếu source/cron chưa thực thi |
| Custom field kiểu formula, mandatory, shared library đầy đủ | Cần kiểm tra edition và model cụ thể của Plane | Chỉ ghi “đã có” sau khi có model/API/UI/test thực tế |

---

## 4. Mô hình nghiệp vụ nên dùng sau khi cập nhật

```text
XBus User
   │ identity sync
   ▼
Plane Workspace (xbus-office)
   │
   ├── WorkspaceMember: Admin / Member / Guest
   │
   └── Project: Public / Secret
         │
         ├── ProjectMember: Admin / Member / Guest
         ├── State: backlog / unstarted / started / completed / cancelled
         ├── Cycle
         ├── Module
         ├── Label
         ├── View
         ├── Page
         ├── Intake
         └── Work item/Issue
               ├── assignee_ids[]
               ├── parent_id
               ├── state_id
               ├── cycle_id
               ├── module_ids[]
               ├── label_ids[]
               ├── start_date / target_date
               ├── priority / estimate
               ├── comment/activity
               └── attachment
```

### 4.1. Mapping thuật ngữ

| Plane/source | Hiển thị tiếng Việt chuẩn |
| --- | --- |
| Workspace | Không gian làm việc |
| Project | Dự án |
| Work item / Issue | Công việc |
| Assignee | Người phụ trách |
| State | Trạng thái |
| Cycle | Chu kỳ |
| Module | Nhóm công việc |
| Intake | Tiếp nhận |
| Due date / target date | Hạn hoàn thành |
| View | Chế độ xem |
| Page | Trang tài liệu |

Giữ nguyên các thuật ngữ: Plane, API, webhook, Kanban, Gantt, Epic, Sprint, GitHub, OAuth, SAML, SMTP.

---

## 5. Phân loại yêu cầu: có thật trong source, cần kiểm chứng, và chưa có

### 5.1. Có thật trong source hoặc tích hợp hiện tại

- XBus → Plane identity bridge.
- Ticket đăng nhập ngắn hạn dùng một lần.
- Workspace và Project.
- Workspace member và Project member.
- Role backend: Admin, Member, Guest.
- Project Public/Secret.
- Work item/Issue có:
  - nhiều assignee;
  - state;
  - priority;
  - start date/target date;
  - label;
  - cycle;
  - module;
  - parent/sub-work item;
  - comment/activity;
  - attachment count.
- Project issue list và issue detail.
- Cycle, Module, View, Page, Intake và Archive có route/source.
- Gantt/timeline infrastructure tồn tại trong frontend.
- Nhúng Plane vào XBus bằng iframe và same-origin reverse proxy production.
- Giao diện tiếng Việt và embedded mode.
- Lấy nhật ký hoạt động Plane về XBus.
- Test định tuyến Nginx và test ánh xạ nhân sự.

### 5.2. Có model/source nhưng phải kiểm chứng bằng runtime và edition

- Calendar, Board/Kanban, spreadsheet và các layout nâng cao.
- Gantt đầy đủ.
- Dependency giữa work item.
- Custom fields nâng cao.
- Notifications/Inbox.
- Draft work item không cần Project.
- Guest và lời mời ngoài tổ chức.
- Template/import/export.
- Realtime collaboration cho tất cả màn hình.
- Archive/restore theo thời hạn cụ thể.

Trước khi ghi “đã hỗ trợ”, coding agent phải chỉ ra:

1. model;
2. API endpoint;
3. permission;
4. service/store frontend;
5. UI route/component;
6. test hoặc runtime evidence.

### 5.3. Chưa được chứng minh hoặc không phù hợp hiện trạng

- Project role Admin/Editor/Commenter/Viewer.
- Team với ba cơ chế public/request/private như Asana.
- Một work item thuộc nhiều Project.
- Portfolio/Goal đầy đủ trong Community Edition hiện tại.
- Workload/capacity hoàn chỉnh.
- Automation rule builder hoàn chỉnh.
- AI tự tóm tắt/tạo subtask.
- Billing/trial.
- Login/password/quên mật khẩu riêng của Plane cho nhân sự XBus.
- Cam kết thùng rác 30 ngày.
- Công thức custom field và trường bắt buộc nếu chưa có API thực tế.

---

## 6. Permission Matrix cần sửa

Không dùng trực tiếp bảng Project Admin/Editor/Commenter/Viewer trong tài liệu cũ.

### 6.1. Ma trận nền tảng hiện tại

| XBus role | Plane workspace role được sync | Ghi chú |
| --- | --- | --- |
| `admin` | Admin | Quản trị workspace và dữ liệu công việc |
| `assistant` | Member | Không được tự động nâng lên Admin |
| `user` | Member | Quyền cụ thể tiếp tục phụ thuộc Project membership |
| user disabled | Không được truy cập | Giữ lịch sử công việc cũ |

### 6.2. Project role hiện có trong backend Plane

- Admin = `20`.
- Member = `15`.
- Guest = `5`.

Mọi thay đổi permission phải thực hiện đồng thời ở:

- Django model/constants.
- Permission classes API.
- Serializer/viewset/service.
- TypeScript types/constants.
- Store/hook permission frontend.
- Button/menu/route guard.
- Migration dữ liệu.
- Unit/integration/E2E tests.

Tuyệt đối không chỉ ẩn nút ở UI.

---

## 7. Thay đổi cần thực hiện đối với tài liệu BA Module 7

### 7.1. Viết lại UC-S01

Tên mới: **Truy cập Quản lý công việc từ XBus**.

Luồng đúng:

1. User đăng nhập XBus bằng Google Workspace.
2. XBus kiểm tra tài khoản còn `able`.
3. XBus đồng bộ hồ sơ công việc sang Plane.
4. XBus yêu cầu one-time ticket.
5. Trình duyệt POST ticket sang `/auth/xbus/`.
6. Plane tạo session và mở workspace `xbus-office`/danh sách Project.
7. User disabled bị từ chối và không được cấp ticket.

Loại bỏ:

- nhập mật khẩu Plane;
- sai mật khẩu 5 lần;
- quên mật khẩu Plane;
- chọn workspace gần nhất;
- banner billing/trial.

### 7.2. Viết lại UC-S02

- Ưu tiên chọn thành viên đã được đồng bộ từ XBus.
- Không mời email ngoài hệ thống nếu chưa có phê duyệt bảo mật.
- Role phải dùng Admin/Member/Guest của Plane.
- Khi user bị disabled, quyền truy cập mới phải bị thu hồi nhưng lịch sử vẫn giữ.

### 7.3. Viết lại UC Project/Task

- “Section” đổi thành “State” hoặc nhóm hiển thị theo State/assignee/priority.
- “Task” đổi thành “Công việc/Work item”.
- Assignee là danh sách, không bắt buộc chỉ một người.
- Dùng Cycle cho sprint/time-box.
- Dùng Module để gom nhóm phạm vi/epic-like.
- Không mô tả multi-homing nếu source chưa hỗ trợ.
- Project Public/Secret phải bám `ProjectNetwork`.

### 7.4. Tách phạm vi theo độ chắc chắn

- **P0 — tích hợp bắt buộc:** SSO bridge, user sync, revocation, same-origin routing, tiếng Việt, security.
- **P1 — lõi Plane CE:** Project, Work item, State, Cycle, Module, Label, List/Board, assignee, due date, comment, activity.
- **P2 — kiểm chứng edition:** Calendar, Gantt, View, Page, Intake, custom fields, import/export, notification.
- **P3 — phát triển mới:** role 4 cấp, portfolio/goals, workload, advanced rule, AI, multi-homing.

---

## 8. Phạm vi coding ưu tiên tiếp theo

### 8.1. Ưu tiên 1 — Hoàn thiện tích hợp, không xây lại Plane

- Ổn định bridge XBus ↔ Plane.
- Kiểm thử khi user đổi tên/email/phòng ban/avatar/role/status.
- Kiểm thử thu hồi quyền user disabled.
- Kiểm thử email trùng với tài khoản Plane có sẵn.
- Kiểm thử ticket hết hạn, dùng lại ticket và CSRF/origin.
- Không log ticket hoặc `PLANE_BRIDGE_SECRET`.
- Bảo đảm iframe/same-origin hoạt động trên local và production.

### 8.2. Ưu tiên 2 — Việt hóa đúng source

- Dùng `useTranslation`.
- Sửa key tại `services/plane/packages/i18n/src/locales`.
- Không hard-code nhãn tiếng Anh mới.
- Không dịch identifier, URL, mã Project, tên State do người dùng đặt.
- Kiểm tra:

```bash
cd services/plane
pnpm --filter @plane/i18n test:vi
pnpm --filter web check:types
VITE_XBUS_EMBEDDED=true pnpm turbo run build --filter=web
```

### 8.3. Ưu tiên 3 — Nghiệm thu theo khả năng Plane CE

Lập checklist runtime cho từng chức năng trong Module 7:

- Tạo/sửa/archive Project.
- Thêm Project member và role.
- Tạo/sửa/hoàn thành Work item.
- Nhiều assignee.
- State và State group.
- Cycle.
- Module.
- Label.
- Parent/sub-work item.
- List/Board và các layout được bật.
- Comment, activity, attachment.
- Filter/sort/group.
- Notifications/My work nếu edition hỗ trợ.

Mỗi mục phải đánh dấu:

```text
[MODEL] [API] [PERMISSION] [SERVICE/STORE] [UI] [TEST] [RUNTIME]
```

### 8.4. Ưu tiên 4 — GAP implementation

Chỉ phát triển GAP sau khi xác nhận Plane CE chưa có và cậu chủ duyệt phạm vi. Không xây module trùng chức năng Plane.

---

## 9. Quy tắc code bắt buộc

1. Không xóa hoặc thay đổi giấy phép `LICENSE`, `COPYRIGHT.txt` của Plane.
2. Không nâng cấp toàn bộ Plane khi chưa có kế hoạch migration và rollback.
3. Không sửa bundle đã build; sửa source rồi build lại.
4. Không tạo API XBus trùng với API Plane chỉ để né việc hiểu source Plane.
5. Không lưu `PLANE_BRIDGE_SECRET`, ticket, cookie hoặc credential vào Git/log.
6. Không gửi dữ liệu HR nhạy cảm sang Plane.
7. API phải kiểm tra permission; UI guard không đủ.
8. Dùng test-first cho bug và nghiệp vụ mới.
9. Không `git add -A`; chỉ stage file đúng phạm vi.
10. Không tự deploy hoặc push nếu chưa có yêu cầu cụ thể.
11. Trước khi sửa phải kiểm tra `git status`; repository hiện có thể chứa thay đổi chưa commit của Plane/Trà chiều/dữ liệu JSON.
12. Không reset/stash/ghi đè công việc chưa commit của người khác.

---

## 10. Vùng code và lệnh vận hành

### XBus integration

```text
src/app/(dashboard)/work/projects/page.jsx
src/app/api/work/plane/session/route.js
src/libs/planeIntegration.js
src/libs/planeActivity.js
src/data/navigation/*MenuData.jsx
src/middleware.ts
docs/plane-integration.md
```

### Plane source

```text
services/plane/apps/api
services/plane/apps/web
services/plane/packages/types
services/plane/packages/i18n
services/plane/packages/ui
services/plane-xbus
```

### Tests liên quan

```text
tests/plane-personnel.test.mjs
tests/plane-module-routing.test.mjs
scripts/test-plane-activity.py
```

### Lệnh local

```bash
npm run plane:start
npm run plane:logs
npm run plane:stop
npm run plane:sync-personnel
```

Build-only không deploy:

```bash
bash deploy.sh --build-only
```

---

## 11. Acceptance Criteria cập nhật

### AC-01 — Truy cập từ XBus

- User active đăng nhập XBus có thể mở `/work/projects` mà không đăng nhập Plane lần hai.
- Ticket không xuất hiện trong URL hoặc log.
- Ticket hết hạn/dùng lại bị từ chối.

### AC-02 — Thu hồi truy cập

- User disabled không nhận ticket mới.
- User bị loại khỏi XBus không tiếp tục truy cập workspace.
- Dữ liệu activity/work item lịch sử không bị xóa vật lý.

### AC-03 — Đồng bộ hồ sơ

- Tên, email, mã nhân viên, phòng ban, loại nhân sự, chức danh và avatar được cập nhật.
- Không có mật khẩu, CCCD, ngày sinh, địa chỉ hoặc dữ liệu tài chính trong payload Plane.
- Email trùng tài khoản không thuộc XBus phải dừng và báo lỗi.

### AC-04 — Permission

- Admin XBus được workspace Admin.
- User/Assistant XBus không tự động có workspace Admin.
- Permission được kiểm tra tại API Plane.
- Project Secret không lộ cho người không phải thành viên.

### AC-05 — UI nhúng

- `/work/projects` chỉ hiển thị một bộ navigation phù hợp, không lặp sidebar Plane/XBus ngoài thiết kế.
- Plane iframe chiếm đúng vùng nội dung và có focus mode.
- Local và production same-origin hoạt động đúng.
- Giao diện mặc định là tiếng Việt.

### AC-06 — Chức năng lõi

- Project, Work item, State, Cycle, Module, assignee, label, comment và activity hoạt động bằng API Plane thật.
- Thay đổi ở một layout phản ánh cùng dữ liệu ở layout khác.
- Parent/sub-work item không hiển thị trùng ở danh sách root khi parent đã tải.

### AC-07 — Build/test

- Test bridge và Nginx routing đạt.
- Type check frontend Plane đạt.
- Test i18n tiếng Việt đạt.
- Build embedded Plane đạt.
- Build XBus đạt.

---

## 12. Test Scenario tối thiểu

| Mã | Scenario | Kết quả mong đợi |
| --- | --- | --- |
| TS-W01 | User active mở `/work/projects` | Tự đăng nhập Plane, mở danh sách Project |
| TS-W02 | User disabled mở `/work/projects` | Không cấp ticket, không vào Plane |
| TS-W03 | Dùng lại ticket lần hai | Bị từ chối |
| TS-W04 | Ticket quá 60 giây | Bị từ chối |
| TS-W05 | Sync admin XBus | Plane workspace role Admin |
| TS-W06 | Sync assistant/user XBus | Plane workspace role Member |
| TS-W07 | Sync user có CCCD/password/address | Payload Plane không chứa trường nhạy cảm |
| TS-W08 | Avatar tương đối/MinIO/version query | Plane nhận URL đầy đủ đúng origin và giữ query |
| TS-W09 | Avatar protocol nguy hiểm | Dùng avatar mặc định an toàn |
| TS-W10 | Email trùng tài khoản Plane ngoài bridge | Sync dừng, không chiếm tài khoản |
| TS-W11 | Project Secret | Người ngoài Project không đọc được |
| TS-W12 | Work item nhiều assignee | Lưu và hiển thị đúng danh sách assignee |
| TS-W13 | Work item có parent | Không lặp child ở root list khi parent đã tải |
| TS-W14 | Chuyển State/List/Board | Dữ liệu đồng bộ cùng work item |
| TS-W15 | User thiếu permission gọi API mutate | HTTP 403, dữ liệu không đổi |
| TS-W16 | Plane unavailable | XBus hiển thị lỗi có thể retry, không lộ secret |
| TS-W17 | Production reverse proxy | Route Plane đi Plane; `/api/auth`, `/api/work`, `/api/users`, `/api/assets` vẫn thuộc XBus |
| TS-W18 | Embedded Vietnamese UI | Thuật ngữ hiển thị theo mapping đã thống nhất |

---

## 13. Definition of Done cho mọi thay đổi Quản lý công việc

Một task chỉ được coi là hoàn tất khi:

- [ ] Có mô tả nghiệp vụ và phạm vi rõ ràng.
- [ ] Chỉ ra model Plane liên quan.
- [ ] Chỉ ra API/service/store/UI liên quan.
- [ ] Permission được kiểm tra ở backend.
- [ ] Có test fail trước và pass sau nếu thay đổi logic.
- [ ] Không gửi dữ liệu HR nhạy cảm.
- [ ] Không phá embedded mode và tiếng Việt.
- [ ] Test i18n/type/build Plane đạt.
- [ ] Test/build XBus đạt.
- [ ] Đã kiểm tra runtime trong `/work/projects`.
- [ ] Không stage file ngoài phạm vi.
- [ ] Không deploy/push khi chưa được phép.
- [ ] Tài liệu BA ghi rõ: **đã có trong source**, **đã kiểm chứng runtime**, hay **chỉ là GAP/yêu cầu tương lai**.

---

## 14. Chỉ dẫn cho coding agent ở lượt tiếp theo

Khi nhận yêu cầu liên quan Quản lý công việc:

1. Đọc file này.
2. Đọc `docs/plane-integration.md`.
3. Chạy `git status --short` và bảo toàn thay đổi hiện có.
4. Xác định chức năng thuộc Plane hay XBus bridge.
5. Truy model → API → permission → service/store → UI trước khi sửa.
6. Không suy diễn từ UI/tài liệu BA rằng chức năng đã tồn tại.
7. Nếu chức năng đã có trong Plane, mở rộng hoặc cấu hình Plane thay vì viết lại trong XBus.
8. Nếu chức năng chưa có, lập GAP analysis và xin duyệt trước khi xây mới.
9. Báo cáo kết quả theo ba nhóm:
   - đã có trong source;
   - đã sửa và kiểm thử;
   - chưa có/ngoài phạm vi/đang bị edition giới hạn.
