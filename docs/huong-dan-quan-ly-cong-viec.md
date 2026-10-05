# Hướng dẫn Quản lý công việc (`/work/projects`)

## 1. Phạm vi tài liệu

Trang **Quản lý công việc → Dự án** tại `/work/projects` hiện sử dụng **Plane Community Edition 1.4.2** được nhúng trực tiếp trong giao diện XBus Management.

Tài liệu này mô tả đúng chức năng đang có ở phiên bản hiện tại, gồm:

- cách XBus kết nối và đăng nhập vào Plane;
- cách sử dụng màn hình dự án và công việc;
- cách tổ chức dự án, trạng thái, chu kỳ và mô-đun;
- tìm kiếm, lọc, sắp xếp và đổi kiểu hiển thị;
- phân quyền và đồng bộ nhân sự;
- xử lý lỗi thường gặp;
- thông tin kỹ thuật dành cho quản trị viên.

> **Lưu ý:** Tài liệu cũ về trình tạo dự án riêng của XBus, thư viện mẫu XBus và nhập CSV theo wizard không còn áp dụng cho `/work/projects`. Dự án và công việc tại đường dẫn này hiện được tạo, lưu trữ và quản lý bởi Plane.

## 2. Kiến trúc chức năng hiện tại

Hệ thống gồm hai ứng dụng phối hợp với nhau:

| Thành phần              | Vai trò                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| XBus Management         | Xác thực nhân sự, cung cấp menu tổng, đồng bộ danh tính và mở trang `/work/projects`                          |
| Plane Community Edition | Quản lý workspace, dự án, work item, trạng thái, thành viên, chu kỳ, mô-đun, bộ lọc và các màn hình nghiệp vụ |

Plane được hiển thị trong iframe của XBus. Production dùng chung origin HTTPS và cổng 443: người dùng mở `/work/projects`, iframe mở `/xbus-office/projects/`. Nginx chuyển các route Plane tới dịch vụ nội bộ, không cần domain riêng hoặc cổng công khai 8443. Ở môi trường local:

```text
XBus:  http://localhost:3000
Plane: http://localhost:3100
```

Workspace Plane dùng cố định:

```text
Tên:  XBus Office
Slug: xbus-office
```

Người dùng không cần tạo mật khẩu Plane và không cần đăng nhập Plane lần thứ hai.

## 3. Mở Quản lý công việc

### 3.1. Luồng mở trang

1. Đăng nhập XBus Management bằng tài khoản đang hoạt động.
2. Mở **Quản lý công việc → Dự án** hoặc truy cập `/work/projects`.
3. XBus đọc danh sách nhân sự hiện tại.
4. XBus đồng bộ danh tính và quyền workspace sang Plane.
5. XBus tạo vé đăng nhập một lần cho tài khoản đang sử dụng.
6. Vé được gửi bằng form `POST` vào iframe Plane.
7. Plane tạo phiên đăng nhập và chuyển thẳng tới danh sách dự án.

Trong lúc kết nối, giao diện hiển thị một trong hai thông báo:

- **Đang đồng bộ nhân sự và kết nối Plane…**: XBus đang chuẩn bị danh tính và vé đăng nhập.
- **Đang mở Plane…**: vé đã được tạo và iframe đang tải ứng dụng Plane.

### 3.2. Trường hợp tải chậm

Sau khoảng 15 giây, màn hình hiển thị cảnh báo tải chậm cùng hai lựa chọn:

- **Kết nối lại**: tạo lại phiên đồng bộ và vé đăng nhập;
- **Mở Plane trong tab mới**: mở trực tiếp origin Plane để kiểm tra hoặc tiếp tục làm việc ngoài iframe.

Mỗi vé đăng nhập:

- có hiệu lực 60 giây;
- chỉ dùng được một lần;
- được gửi trong nội dung form, không xuất hiện trên URL;
- bị xóa ngay sau khi Plane tạo phiên thành công.

## 4. Tổng quan giao diện Plane

Giao diện chính gồm ba khu vực.

### 4.1. Thanh điều hướng bên trái

Các mục thường thấy:

- **Home**: trang tổng hợp hoạt động và widget cá nhân;
- **Drafts**: các work item đang soạn dở nếu chức năng này được dùng;
- **Your work**: công việc liên quan tới người đang đăng nhập;
- **Stickies**: ghi chú nhanh cá nhân;
- **Projects**: danh sách toàn bộ dự án người dùng có quyền truy cập;
- **More**: mở thêm chức năng workspace được Plane cung cấp;
- danh sách dự án: truy cập nhanh từng dự án.

Nút **New work item** cho phép tạo nhanh một work item. Khi dùng nút này, cần kiểm tra đúng dự án trước khi lưu.

### 4.2. Thanh công cụ phía trên nội dung

Ở màn hình Projects, thanh công cụ có thể gồm:

- tìm kiếm;
- sắp xếp, mặc định có lựa chọn theo ngày tạo;
- bộ lọc;
- nút **Add Project**;
- các hành động phụ tùy quyền.

### 4.3. Vùng nội dung

Mỗi dự án hiển thị dưới dạng thẻ, thường gồm:

- ảnh bìa hoặc màu nhận diện;
- biểu tượng và tên dự án;
- mã dự án;
- mô tả ngắn;
- thành viên;
- nút cấu hình hoặc hành động nhanh.

Chọn thẻ dự án để mở không gian làm việc của dự án đó.

## 5. Quản lý dự án

### 5.1. Tạo dự án

1. Tại màn hình **Projects**, chọn **Add Project**.
2. Nhập tên dự án.
3. Chọn hoặc kiểm tra mã dự án. Mã này được dùng trong mã work item, ví dụ `OPS-25`.
4. Chọn biểu tượng, emoji hoặc hình ảnh nhận diện nếu cần.
5. Nhập mô tả để nêu mục tiêu và phạm vi dự án.
6. Cấu hình quyền truy cập theo các lựa chọn Plane đang hiển thị.
7. Hoàn tất tạo dự án.

Khuyến nghị:

- dùng một dự án cho một sản phẩm, mục tiêu hoặc luồng vận hành rõ ràng;
- đặt mã ngắn, dễ nhận biết và không thay đổi tùy tiện;
- ghi rõ người phụ trách, phạm vi và tiêu chí hoàn thành trong mô tả;
- tránh tạo nhiều dự án trùng mục đích.

### 5.2. Mở và chuyển dự án

Có thể mở dự án bằng một trong các cách:

- chọn thẻ ở danh sách Projects;
- chọn dự án trong danh sách bên trái;
- dùng tìm kiếm;
- dùng lịch sử hoặc mục gần đây tại Home nếu Plane hiển thị.

### 5.3. Chỉnh sửa dự án

Tùy quyền, phần cấu hình dự án cho phép cập nhật:

- tên, mã và mô tả;
- biểu tượng, emoji, màu hoặc ảnh bìa;
- quyền truy cập;
- thành viên dự án;
- tính năng được bật trong dự án;
- trạng thái work item;
- nhãn, estimate và các thuộc tính hỗ trợ khác;
- lưu trữ hoặc xóa dự án.

Không nên xóa dự án chỉ vì đã hoàn thành. Ưu tiên lưu trữ để giữ lịch sử công việc và trao đổi.

### 5.4. Thành viên dự án

Thành viên workspace được đồng bộ từ XBus, nhưng quyền tham gia từng dự án vẫn có thể được quản lý trong Plane.

Khi thêm người vào dự án:

1. mở phần thành viên hoặc cài đặt dự án;
2. tìm theo tên hoặc email công việc;
3. chọn đúng nhân sự;
4. gán vai trò dự án phù hợp;
5. lưu thay đổi.

Không tạo thủ công một tài khoản Plane mới cho nhân sự đã có trong XBus. Việc này có thể gây xung đột email với danh tính được đồng bộ.

## 6. Work item (công việc)

Plane gọi đầu việc là **work item**. Một work item có mã duy nhất trong dự án, ví dụ `NGTT-12`.

### 6.1. Tạo work item

Có thể tạo bằng:

- nút **New work item** ở thanh bên;
- nút thêm mới trong dự án;
- nút thêm nhanh trong một nhóm hoặc trạng thái;
- lệnh tạo nhanh nếu giao diện Plane cung cấp.

Thông tin nên nhập:

| Trường      | Ý nghĩa và cách dùng                                                 |
| ----------- | -------------------------------------------------------------------- |
| Title       | Kết quả cần đạt; viết ngắn gọn, bắt đầu bằng động từ khi phù hợp     |
| Description | Bối cảnh, yêu cầu, tiêu chí nghiệm thu, liên kết và ghi chú kỹ thuật |
| State       | Trạng thái hiện tại trong quy trình của dự án                        |
| Assignee    | Một hoặc nhiều người chịu trách nhiệm theo cấu hình Plane            |
| Priority    | Mức độ ưu tiên của công việc                                         |
| Start date  | Ngày dự kiến bắt đầu                                                 |
| Due date    | Hạn hoàn thành                                                       |
| Labels      | Phân loại theo nhóm nghiệp vụ, loại yêu cầu hoặc đặc điểm            |
| Cycle       | Chu kỳ thực hiện, ví dụ sprint hoặc tuần vận hành                    |
| Module      | Nhóm chức năng hoặc hạng mục lớn                                     |
| Estimate    | Ước lượng khối lượng nếu dự án bật tính năng này                     |

Ví dụ tiêu đề tốt:

```text
Đối soát dữ liệu chuyến xe ngày 05/10
Cập nhật API đồng bộ trạng thái phương tiện
Kiểm thử luồng đăng nhập tài xế
Gửi báo cáo vận hành tuần 40
```

Tránh các tiêu đề quá chung như “Sửa lỗi”, “Làm báo cáo” hoặc “Kiểm tra lại”.

### 6.2. Xem chi tiết

Chọn một work item để mở màn hình hoặc panel chi tiết. Tùy cấu hình dự án, người dùng có thể:

- sửa tiêu đề và mô tả;
- đổi trạng thái;
- thay đổi người phụ trách;
- đặt ưu tiên và thời hạn;
- thêm hoặc bỏ nhãn;
- đưa work item vào cycle hoặc module;
- tạo sub-work item;
- thêm liên kết và tệp đính kèm;
- xem lịch sử hoạt động;
- bình luận và trao đổi;
- sao chép liên kết work item;
- lưu trữ hoặc xóa nếu có quyền.

### 6.3. Trạng thái

Mỗi dự án có bộ trạng thái riêng. Tên cụ thể có thể khác nhau, nhưng thường thuộc các nhóm logic:

```text
Backlog/Chưa bắt đầu
→ Planned/Sẵn sàng
→ Started/Đang thực hiện
→ Completed/Hoàn thành
→ Cancelled/Hủy
```

Nguyên tắc cập nhật:

- chuyển sang trạng thái đang làm khi thực sự bắt đầu;
- không để work item hoàn thành nhưng vẫn ở trạng thái đang thực hiện;
- dùng trạng thái hủy cho việc không còn thực hiện thay vì xóa mất lịch sử;
- nếu bị chặn, ghi nguyên nhân trong bình luận hoặc dùng trạng thái/nhãn phù hợp của dự án.

### 6.4. Ưu tiên

Plane hỗ trợ các mức ưu tiên theo cấu hình hiện tại, thường gồm:

- không đặt ưu tiên;
- thấp;
- trung bình;
- cao;
- khẩn cấp.

Ưu tiên phản ánh mức độ cần xử lý, không thay thế hạn hoàn thành. Một work item quan trọng nên có cả priority và due date rõ ràng.

### 6.5. Người phụ trách

Chỉ gán cho thành viên có quyền trong workspace hoặc dự án. Khi nhân sự không xuất hiện trong danh sách:

1. kiểm tra trạng thái nhân sự trong XBus;
2. tải lại `/work/projects` để chạy đồng bộ;
3. kiểm tra người đó đã được thêm vào dự án chưa;
4. nhờ quản trị viên kiểm tra xung đột email nếu vẫn không thấy.

### 6.6. Ngày bắt đầu và hạn hoàn thành

- **Start date** dùng cho kế hoạch và timeline.
- **Due date** dùng để nhận biết việc sắp đến hạn hoặc quá hạn.
- Nếu công việc kéo dài nhiều ngày, nên đặt cả hai.
- Nếu thay đổi hạn, ghi lý do trong bình luận để giữ bối cảnh.

### 6.7. Nhãn

Nhãn dùng để phân loại xuyên qua trạng thái, ví dụ:

```text
backend, frontend, vận-hành, sự-cố, bảo-mật, dữ-liệu, cần-duyệt
```

Không dùng quá nhiều nhãn có cùng ý nghĩa. Quản trị dự án nên chuẩn hóa tên và màu nhãn.

### 6.8. Sub-work item

Dùng sub-work item khi một đầu việc có nhiều bước độc lập cần theo dõi. Mỗi việc con nên có trạng thái và người phụ trách rõ ràng.

Không nên dùng việc con để thay thế hoàn toàn project, cycle hoặc module. Nếu phạm vi quá lớn, hãy tách thành nhiều work item ngang cấp và gom bằng module.

### 6.9. Bình luận và hoạt động

Phần bình luận nên dùng để:

- cập nhật tiến độ quan trọng;
- nêu trở ngại;
- ghi quyết định;
- nhắc đúng người liên quan;
- dẫn liên kết đến tài liệu hoặc kết quả.

Lịch sử hoạt động giúp truy vết ai đã đổi trạng thái, người phụ trách, ngày hoặc thuộc tính khác.

## 7. Các kiểu hiển thị công việc

Plane có thể cung cấp nhiều layout tùy màn hình và tính năng dự án.

### 7.1. List

Phù hợp để đọc nhanh nhiều work item. Có thể nhóm, lọc và sắp xếp để xử lý danh sách dài.

### 7.2. Board

Hiển thị work item dạng thẻ theo cột. Thường dùng để theo dõi luồng trạng thái và kéo thả giữa các cột khi có quyền.

### 7.3. Spreadsheet

Hiển thị dạng bảng, phù hợp khi cần so sánh nhiều thuộc tính hoặc cập nhật danh sách có cấu trúc.

### 7.4. Calendar

Hiển thị theo ngày, hữu ích cho công việc có start date hoặc due date.

### 7.5. Gantt/Timeline

Hiển thị quan hệ thời gian giữa các công việc. Hiệu quả nhất khi dữ liệu ngày bắt đầu và hạn hoàn thành được cập nhật đầy đủ.

Khả năng xuất hiện của từng layout phụ thuộc phiên bản Plane, tính năng được bật và quyền người dùng.

## 8. Tìm kiếm, lọc, nhóm và sắp xếp

### 8.1. Tìm kiếm

Dùng biểu tượng tìm kiếm để tìm dự án hoặc work item theo nội dung Plane hỗ trợ, thường gồm tên và mã.

Khi tìm theo mã, nhập đầy đủ dạng:

```text
NGTT-12
```

### 8.2. Bộ lọc

Có thể kết hợp nhiều điều kiện, chẳng hạn:

- trạng thái hoặc nhóm trạng thái;
- người phụ trách;
- người tạo;
- priority;
- label;
- project;
- cycle;
- module;
- ngày tạo, ngày bắt đầu hoặc hạn hoàn thành.

Nếu danh sách trống bất thường, hãy kiểm tra và xóa các bộ lọc đang áp dụng trước khi kết luận dữ liệu đã mất.

### 8.3. Nhóm

Nhóm work item theo trạng thái, assignee, priority, cycle, module hoặc thuộc tính được hỗ trợ để quan sát phân bố công việc.

### 8.4. Sắp xếp

Màn hình Projects hiện có sắp xếp theo ngày tạo. Ở danh sách work item, các lựa chọn sắp xếp phụ thuộc layout và màn hình hiện tại.

### 8.5. View đã lưu

Nếu dự án bật Views, có thể lưu một tập điều kiện lọc/hiển thị để dùng lại. Ví dụ:

```text
Việc quá hạn của đội vận hành
Lỗi ưu tiên cao chưa hoàn thành
Việc của sprint hiện tại
Việc chưa có người phụ trách
```

## 9. Cycle

Cycle dùng để quản lý công việc trong một khoảng thời gian xác định, tương tự sprint.

Một cycle thường có:

- tên;
- ngày bắt đầu;
- ngày kết thúc;
- danh sách work item;
- tiến độ và thống kê.

Quy trình đề xuất:

1. tạo cycle theo tuần, hai tuần hoặc giai đoạn phù hợp;
2. chọn work item đủ rõ để đưa vào cycle;
3. kiểm tra người phụ trách và estimate;
4. cập nhật trạng thái trong quá trình thực hiện;
5. cuối cycle, xử lý việc chưa xong và ghi nhận kết quả.

Không nên đưa quá nhiều việc chưa được làm rõ vào cycle đang chạy.

## 10. Module

Module gom các work item theo hạng mục hoặc phạm vi chức năng, không nhất thiết bị giới hạn bởi thời gian như cycle.

Ví dụ:

```text
Đăng nhập và phân quyền
Quản lý phương tiện
Báo cáo vận hành
Tích hợp bản đồ
```

Một work item có thể được tổ chức theo module để theo dõi tiến độ của hạng mục lớn, đồng thời vẫn thuộc một cycle thực hiện.

## 11. Home, Your work, Drafts và Stickies

### 11.1. Home

Home là trang tổng quan cá nhân của Plane. Tùy dữ liệu và cấu hình, trang có thể hiển thị dự án gần đây, hoạt động gần đây, ghi chú và các widget khác.

### 11.2. Your work

Tập trung các work item liên quan tới tài khoản hiện tại. Đây là nơi phù hợp để kiểm tra công việc cá nhân hằng ngày trước khi mở từng dự án.

### 11.3. Drafts

Hiển thị nội dung đang soạn dở nếu quy trình tạo work item của Plane lưu draft. Cần hoàn thiện và gửi draft để nó trở thành công việc chính thức.

### 11.4. Stickies

Stickies là ghi chú nhanh cá nhân trong Plane. Không dùng sticky để thay thế work item khi công việc cần giao người, theo dõi trạng thái hoặc đặt hạn.

## 12. Quyền hạn hiện tại

### 12.1. Quyền workspace từ XBus

Khi đồng bộ:

| Vai trò trong XBus                                   | Quyền workspace Plane |
| ---------------------------------------------------- | --------------------- |
| `admin` đang hoạt động                               | Admin                 |
| Người dùng khác đang hoạt động                       | Member                |
| Tài khoản bị vô hiệu hóa hoặc bị loại khỏi danh sách | Mất quyền truy cập    |

XBus phải luôn có ít nhất một quản trị viên đang hoạt động. Quản trị viên đầu tiên phù hợp được dùng làm owner của workspace nếu cần.

### 12.2. Quyền dự án

Quyền dự án được Plane kiểm soát riêng. Khả năng xem, tạo, chỉnh sửa, quản lý thành viên, cấu hình hoặc xóa phụ thuộc:

- vai trò workspace;
- vai trò trong dự án;
- quyền truy cập của dự án;
- trạng thái lưu trữ hoặc khóa;
- tính năng đang bật.

Nếu nút hoặc menu không xuất hiện, trước tiên cần kiểm tra quyền thay vì coi đó là lỗi giao diện.

## 13. Đồng bộ nhân sự

### 13.1. Dữ liệu được đồng bộ

XBus chỉ gửi dữ liệu phục vụ danh tính công việc:

- ID nguồn của nhân sự;
- họ tên;
- email công việc;
- mã nhân sự;
- vai trò admin/member;
- trạng thái hoạt động;
- bộ phận;
- hình thức hoặc nhóm nhân sự;
- chức danh;
- URL avatar.

### 13.2. Dữ liệu không được đồng bộ

Không gửi sang Plane:

- mật khẩu XBus;
- CCCD hoặc giấy tờ cá nhân;
- địa chỉ;
- ngày sinh;
- dữ liệu tài chính;
- thông tin nhân sự riêng tư không cần cho công việc.

### 13.3. Quy tắc danh tính

- ID Plane được tạo ổn định từ ID nhân sự XBus.
- Tên tiếng Việt được giữ nguyên thứ tự.
- Múi giờ là `Asia/Ho_Chi_Minh`.
- Tài khoản tạo từ XBus không có mật khẩu Plane riêng.
- Avatar dùng ảnh XBus hoặc ảnh mặc định của XBus.
- Nếu email đã thuộc một tài khoản Plane khác, đồng bộ dừng để tránh gán nhầm người.
- Khi nhân sự bị vô hiệu hóa, tài khoản và membership Plane bị vô hiệu hóa nhưng lịch sử công việc được giữ lại.

### 13.4. Thời điểm đồng bộ

Đồng bộ chạy mỗi lần người dùng mở hoặc kết nối lại `/work/projects`.

Quản trị viên có thể chạy thủ công:

```bash
npm run plane:sync-personnel
```

Lệnh thành công trả về số nhân sự đang hoạt động và workspace đã đồng bộ.

## 14. Quan hệ với các trang Quản lý công việc cũ

Các route XBus sau vẫn tồn tại trong mã nguồn:

- `/work/my-tasks`;
- `/work/templates`;
- các API `/api/work/*` của hệ thống cũ.

Tuy nhiên, chúng không tự động dùng chung dữ liệu với Plane. Dữ liệu dự án/work item tạo tại `/work/projects` thuộc Plane; dữ liệu của trang cũ thuộc kho dữ liệu quản lý công việc XBus.

Vì vậy:

- không giả định **Công việc của tôi** cũ phản ánh toàn bộ work item trong Plane;
- không giả định mẫu dự án XBus sẽ xuất hiện trong nút **Add Project** của Plane;
- không dùng đồng thời hai hệ thống cho cùng một quy trình nếu chưa có cơ chế đồng bộ dữ liệu nghiệp vụ.

## 15. Quy trình sử dụng đề xuất

### 15.1. Đầu ngày

1. Mở `/work/projects`.
2. Kiểm tra **Your work** hoặc view cá nhân.
3. Xem việc quá hạn và việc đến hạn gần.
4. Xác nhận priority và người phụ trách.
5. Chuyển trạng thái work item bắt đầu thực hiện.

### 15.2. Trong ngày

1. Cập nhật trạng thái ngay khi tiến độ thay đổi.
2. Ghi bình luận khi có quyết định hoặc trở ngại.
3. Điều chỉnh hạn và ghi lý do nếu kế hoạch thay đổi.
4. Tạo work item mới cho việc phát sinh cần theo dõi.
5. Không dùng sticky hoặc tin nhắn riêng thay cho công việc chính thức.

### 15.3. Cuối ngày hoặc cuối chu kỳ

1. Đóng các work item đã hoàn thành.
2. Kiểm tra việc đang làm nhưng không có cập nhật.
3. Chuyển hoặc lập kế hoạch lại việc chưa hoàn thành.
4. Kiểm tra work item chưa có assignee, priority hoặc due date.
5. Ghi tóm tắt kết quả quan trọng trong bình luận hoặc tài liệu dự án.

## 16. Nguyên tắc quản trị dữ liệu

- Một work item phải thể hiện một kết quả kiểm chứng được.
- Giao rõ người chịu trách nhiệm chính.
- Công việc quan trọng phải có due date.
- Dùng cycle cho thời gian, module cho phạm vi chức năng và label cho phân loại.
- Không xóa dữ liệu chỉ để làm sạch giao diện; ưu tiên hoàn thành, hủy hoặc lưu trữ.
- Không tạo tài khoản Plane thủ công cho nhân sự XBus.
- Không chia sẻ URL, cookie hoặc vé đăng nhập cho người khác.
- Không đưa thông tin nhân sự nhạy cảm vào mô tả hoặc bình luận công việc.

## 17. Xử lý sự cố dành cho người dùng

### 17.1. Không mở được Plane

Thực hiện lần lượt:

1. chọn **Kết nối lại**;
2. tải lại trang;
3. đăng xuất rồi đăng nhập lại XBus;
4. chọn **Mở Plane trong tab mới**;
5. báo quản trị viên nếu vẫn lỗi.

### 17.2. Màn hình tải quá lâu

- chờ cảnh báo sau 15 giây;
- thử kết nối lại;
- kiểm tra Plane có mở được ở origin riêng không;
- hard refresh trình duyệt nếu frontend Plane vừa được cập nhật.

### 17.3. Không thấy dự án

- xóa bộ lọc đang áp dụng;
- kiểm tra tìm kiếm;
- kiểm tra dự án có bị lưu trữ không;
- kiểm tra membership và quyền truy cập dự án;
- nhờ admin xác nhận bạn đã được thêm vào dự án.

### 17.4. Không thấy nhân sự để giao việc

- kiểm tra tài khoản nhân sự đang hoạt động trong XBus;
- tải lại `/work/projects` để đồng bộ;
- kiểm tra email không bị trùng với tài khoản Plane khác;
- thêm nhân sự vào dự án nếu dự án giới hạn thành viên.

### 17.5. Giao diện vẫn dùng CSS cũ

Thực hiện hard refresh:

```text
macOS:   Command + Shift + R
Windows: Ctrl + Shift + R
```

## 18. Vận hành kỹ thuật dành cho quản trị viên

### 18.1. Các lệnh chính

Khởi động Plane:

```bash
npm run plane:start
```

Xem log:

```bash
npm run plane:logs
```

Đồng bộ nhân sự thủ công:

```bash
npm run plane:sync-personnel
```

Dừng Plane:

```bash
npm run plane:stop
```

### 18.2. Các service chính

Stack Plane gồm:

- `web`: frontend Plane;
- `api`: Django API và XBus identity bridge;
- `worker`: xử lý tác vụ nền;
- `beat-worker`: lập lịch tác vụ;
- `live`: realtime;
- `proxy`: Caddy định tuyến request;
- `plane-db`: PostgreSQL;
- `plane-redis`: Redis/Valkey;
- `plane-mq`: RabbitMQ;
- `plane-minio`: lưu trữ tệp;
- `admin`, `space`, `migrator`: các service hỗ trợ của Plane.

### 18.3. Cấu hình bắt buộc

Các biến quan trọng:

| Biến                    | Mục đích                                  |
| ----------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_PLANE_URL` | URL Plane mà trình duyệt truy cập         |
| `PLANE_INTERNAL_URL`    | URL Plane mà server XBus truy cập; Docker VPS dùng `http://host.docker.internal:3100` |
| `PLANE_PUBLIC_URL`      | URL Plane công khai cho server tạo login URL; production bằng origin XBus |
| `PLANE_BRIDGE_SECRET`   | Secret phía XBus để gọi identity bridge   |
| `XBUS_BRIDGE_SECRET`    | Secret tương ứng phía Plane               |
| `XBUS_FRAME_ANCESTORS`  | Origin XBus được phép nhúng Plane         |
| `NEXTAUTH_URL`          | Origin XBus dùng để tạo URL avatar đầy đủ |
| `DEBUG`                 | Phải là `0` hoặc `1`; production dùng `0` |

`PLANE_BRIDGE_SECRET` và `XBUS_BRIDGE_SECRET` phải giống nhau, đủ ngẫu nhiên và dài ít nhất 32 byte. Không đặt secret trong biến có tiền tố `NEXT_PUBLIC_`.

Override Docker khóa `DEBUG: "0"` cho các backend service để tránh biến `DEBUG` của host ghi đè thành giá trị không hợp lệ như `release`.

### 18.4. Endpoint tích hợp

| Endpoint                                 | Chức năng                                                    |
| ---------------------------------------- | ------------------------------------------------------------ |
| `POST /api/work/plane/session` trên XBus | Kiểm tra phiên XBus, đồng bộ roster và trả login URL/ticket  |
| `POST /api/xbus/bootstrap/` trên Plane   | Xác thực bridge secret, đồng bộ nhân sự và tạo ticket        |
| `POST /auth/xbus/` trên Plane            | Tiêu thụ ticket một lần, tạo session và chuyển vào workspace |

Endpoint bootstrap không được gọi từ trình duyệt và không được công khai secret.

### 18.5. Bảo mật iframe

Proxy Plane:

- bỏ `X-Frame-Options` mặc định chặn iframe;
- đặt CSP `frame-ancestors` chỉ cho phép chính Plane và origin XBus được cấu hình;
- không nhúng Plane từ origin không tin cậy;
- production dùng chung origin HTTPS với XBus qua Nginx.

Ví dụ:

```text
XBus:  https://xbus-office.xmobility.vn/work/projects
Plane: https://xbus-office.xmobility.vn/xbus-office/projects/
```

### 18.6. Kiểm tra nhanh khi gặp HTTP 502

Kiểm tra trạng thái:

```bash
docker compose --project-directory . --env-file plane.env -p xbus-plane \
  -f services/plane/deployments/cli/community/docker-compose.yml \
  -f docker-compose.plane.override.yml ps
```

Xem log API:

```bash
docker compose --project-directory . --env-file plane.env -p xbus-plane \
  -f services/plane/deployments/cli/community/docker-compose.yml \
  -f docker-compose.plane.override.yml logs --tail=200 api proxy
```

Nếu thấy lỗi:

```text
ValueError: invalid literal for int() with base 10: 'release'
```

hãy xác nhận container nhận `DEBUG=0` rồi recreate API/worker.

### 18.7. Bản vá frontend Plane hiện tại

Image frontend XBus đang áp dụng các điều chỉnh dành cho chế độ nhúng:

- sửa hydration mismatch của theme;
- ẩn top navigation trùng với header XBus;
- bỏ padding 8px quanh workspace để nền trắng Plane thẳng mép với vùng hiển thị;
- giữ giao diện Plane bên trong card dashboard XBus.

Các bản vá phụ thuộc bundle của Plane 1.4.2. Khi nâng phiên bản Plane phải kiểm tra lại `services/plane-xbus/Dockerfile.web` thay vì mặc định các chuỗi bundle cũ vẫn còn đúng.

## 19. Giới hạn hiện tại

- XBus và Plane là hai ứng dụng độc lập; iframe không cho XBus điều khiển trực tiếp state bên trong Plane.
- Chỉ danh tính nhân sự được đồng bộ; dự án và work item không đồng bộ với API quản lý công việc cũ của XBus.
- Giao diện Plane hiện dùng tiếng Anh ở nhiều vị trí.
- Một số tính năng có thể không xuất hiện do giới hạn Community Edition, cấu hình dự án hoặc quyền người dùng.
- Mở Plane trong tab mới vẫn dùng session riêng của Plane sau khi luồng đăng nhập thành công.
- Nâng cấp image Plane cần kiểm thử lại identity bridge, CSP iframe và các bản vá frontend.

## 20. Checklist triển khai một dự án mới

1. Xác định mục tiêu và phạm vi dự án.
2. Tạo dự án và mã dự án ngắn gọn.
3. Thiết lập mô tả, biểu tượng và quyền truy cập.
4. Thêm thành viên và kiểm tra vai trò.
5. Chuẩn hóa state và label.
6. Bật các tính năng cần dùng như cycle, module hoặc view.
7. Tạo module theo hạng mục lớn nếu cần.
8. Tạo cycle đầu tiên nếu làm việc theo thời gian.
9. Tạo work item với assignee, priority và due date đầy đủ.
10. Tạo view dùng chung cho các danh sách quan trọng.
11. Thống nhất quy tắc cập nhật trạng thái và bình luận.
12. Cuối chu kỳ, rà soát việc hoàn thành, quá hạn và chưa được giao.
