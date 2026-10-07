# Hướng dẫn sử dụng Quản lý công việc — XBus Office

Tài liệu dành cho người tạo dự án, người quản lý và nhân sự thực hiện công việc trên trang **Quản lý công việc** tại `/work/projects`. Hướng dẫn đi từ tạo dự án, thiết lập đội ngũ, lập kế hoạch đến thực hiện, kiểm tra kết quả và lưu trữ.

Nội dung đối chiếu với phiên bản hiện tại của module XBus Office, dựa trên source Plane Community Edition 1.4.2. Tên trạng thái, nhãn và một số mục có thể khác giữa các dự án do người quản lý cấu hình. Các quy tắc phối hợp là **quy trình đề xuất của đội ngũ**. Bản tùy chỉnh XBus bổ sung nghiệm thu có kiểm tra quyền cho công việc đã được Admin chọn người nghiệm thu; xem mục 12.4. Công việc chưa cấu hình nghiệm thu vẫn dùng luồng thông thường.

## Mục lục

1. [Mở trang và hiểu các khu vực làm việc](#1-mở-trang-và-hiểu-các-khu-vực-làm-việc)
2. [Chọn cách tổ chức công việc trước khi tạo dự án](#2-chọn-cách-tổ-chức-công-việc-trước-khi-tạo-dự-án)
3. [Tạo dự án mới](#3-tạo-dự-án-mới)
4. [Thiết lập dự án và thành viên](#4-thiết-lập-dự-án-và-thành-viên)
5. [Thiết lập trạng thái, nhãn và ước lượng](#5-thiết-lập-trạng-thái-nhãn-và-ước-lượng)
6. [Tạo, giao và chỉnh sửa công việc](#6-tạo-giao-và-chỉnh-sửa-công-việc)
7. [Chia việc con và quản lý quan hệ giữa công việc](#7-chia-việc-con-và-quản-lý-quan-hệ-giữa-công-việc)
8. [Lập kế hoạch theo nhóm công việc](#8-lập-kế-hoạch-theo-nhóm-công-việc)
9. [Lập kế hoạch theo chu kỳ](#9-lập-kế-hoạch-theo-chu-kỳ)
10. [Sử dụng các kiểu xem công việc](#10-sử-dụng-các-kiểu-xem-công-việc)
11. [Tìm kiếm, lọc, nhóm, sắp xếp và lưu chế độ xem](#11-tìm-kiếm-lọc-nhóm-sắp-xếp-và-lưu-chế-độ-xem)
12. [Thực hiện, báo cáo tiến độ và nghiệm thu](#12-thực-hiện-báo-cáo-tiến-độ-và-nghiệm-thu)
13. [Xử lý các tình huống nghiệp vụ](#13-xử-lý-các-tình-huống-nghiệp-vụ)
14. [Theo dõi tiến độ và phân tích](#14-theo-dõi-tiến-độ-và-phân-tích)
15. [Tiếp nhận yêu cầu, tài liệu và công việc cá nhân](#15-tiếp-nhận-yêu-cầu-tài-liệu-và-công-việc-cá-nhân)
16. [Hoàn tất, lưu trữ và xóa dữ liệu](#16-hoàn-tất-lưu-trữ-và-xóa-dữ-liệu)
17. [Ví dụ xuyên suốt: một dự án đối soát vận hành](#17-ví-dụ-xuyên-suốt-một-dự-án-đối-soát-vận-hành)
18. [Checklist theo vai trò](#18-checklist-theo-vai-trò)
19. [Xử lý lỗi và câu hỏi thường gặp](#19-xử-lý-lỗi-và-câu-hỏi-thường-gặp)

## 1. Mở trang và hiểu các khu vực làm việc

### 1.1. Truy cập

1. Đăng nhập XBus Office bằng tài khoản nhân sự đang hoạt động.
2. Chọn **Quản lý công việc** ở sidebar của XBus hoặc mở `/work/projects`.
3. Chờ hiệu ứng loading XBus kết thúc để vào danh sách dự án.
4. Chọn dự án cần làm việc.

Tài khoản được kết nối từ XBus; thông thường không cần tạo tài khoản hoặc mật khẩu riêng cho module. Nhân sự được đồng bộ không đồng nghĩa với việc họ đã có quyền trong mọi dự án.

Nếu màn hình báo không thể kết nối hoặc đồng bộ nhân sự, chọn **Kết nối lại**. Nếu cần, dùng **Mở XBus Office trong tab mới** theo lựa chọn trên màn hình.

### 1.2. Thanh điều hướng của module

| Mục                   | Dùng khi nào                                                        |
| --------------------- | ------------------------------------------------------------------- |
| **Công việc mới**     | Tạo nhanh công việc; kiểm tra dự án được chọn trước khi lưu         |
| **Trang chủ**         | Xem thông tin cá nhân và các nội dung tổng hợp mà hệ thống hiển thị |
| **Bản nháp**          | Tiếp tục hoàn thiện công việc đang soạn dở                          |
| **Công việc của tôi** | Rà soát công việc liên quan đến tài khoản hiện tại                  |
| **Ghi chú nhanh**     | Ghi lại ý tưởng hoặc việc cần nhớ của cá nhân                       |
| **Dự án**             | Tìm, mở và tạo dự án                                                |
| **Chế độ xem**        | Mở các danh sách được lưu theo điều kiện lọc                        |
| **Phân tích**         | Xem số liệu tổng hợp theo phạm vi được phép                         |
| **Lưu trữ**           | Tìm dữ liệu đã đưa ra khỏi luồng làm việc thường xuyên              |
| **Xem thêm**          | Truy cập các mục khác được hệ thống cung cấp                        |

Bên dưới là danh sách dự án truy cập nhanh. Khi mở rộng một dự án, các mục như **Công việc**, **Chu kỳ**, **Nhóm công việc**, **Trang**, **Chế độ xem** hoặc **Tiếp nhận** xuất hiện theo tính năng được bật và quyền truy cập.

### 1.3. Đọc màn hình công việc của dự án

- Phần trên cho biết **dự án đang mở** và mục **Công việc**. Luôn kiểm tra tên dự án trước khi tạo hoặc giao việc.
- Bộ chọn kiểu xem dùng các biểu tượng. Rê chuột lên biểu tượng để đọc tên kiểu xem.
- **Hiển thị** dùng để điều chỉnh các thuộc tính, cách nhóm và sắp xếp được hỗ trợ ở màn hình đó.
- Bộ lọc giới hạn danh sách theo điều kiện đã chọn.
- **Phân tích** mở thông tin phân tích của dự án khi được cung cấp.
- **Thêm công việc** tạo công việc trong dự án đang mở.
- Bấm vào tên công việc để mở bảng chi tiết hoặc trang chi tiết; menu **…** chứa các hành động bổ sung.

Các màn hình khác nhau có thể đặt nút ở vị trí khác nhau. Nếu thiếu một nút, kiểm tra quyền và tính năng của dự án trước.

## 2. Chọn cách tổ chức công việc trước khi tạo dự án

### 2.1. Phân biệt các khái niệm

| Khái niệm                   | Trả lời câu hỏi                                                 | Ví dụ                                          |
| --------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| **Dự án**                   | Đội ngũ đang thực hiện mục tiêu hoặc luồng công việc nào?       | Chuẩn hóa đối soát chuyến xe                   |
| **Công việc**               | Kết quả cụ thể cần hoàn thành là gì?                            | Kiểm tra chênh lệch số liệu tuyến A            |
| **Việc con**                | Một công việc cần những bước có thể giao và theo dõi riêng nào? | Thu thập dữ liệu; đối chiếu; xác minh sai lệch |
| **Trạng thái**              | Công việc đang ở bước nào?                                      | Cần làm; Đang thực hiện; Hoàn thành            |
| **Nhóm công việc** — Module | Công việc thuộc hạng mục nào?                                   | Thu thập dữ liệu; Báo cáo; Kiểm thử            |
| **Chu kỳ** — Cycle          | Công việc được lên kế hoạch cho đợt nào?                        | Đợt 1 — Tuần 1                                 |
| **Nhãn**                    | Công việc có đặc điểm gì cần lọc nhanh?                         | Vận hành; Dữ liệu; Cần kiểm tra                |
| **Chế độ xem đã lưu**       | Cần mở lại tập công việc nào thường xuyên?                      | Việc quá hạn của đội vận hành                  |

Một công việc thuộc một dự án, có thể gắn nhiều nhãn và nhóm công việc; thuộc một chu kỳ tại một thời điểm. Đưa việc vào chu kỳ hoặc nhóm không tự thay thế người phụ trách, trạng thái và hạn hoàn thành.

### 2.2. Khi nào nên tạo dự án mới?

Tạo dự án khi có mục tiêu, đội ngũ hoặc quy trình quản lý riêng cần theo dõi. Không cần tạo dự án mới cho từng việc nhỏ nếu chúng cùng thuộc một luồng hiện có.

Trước khi tạo, thống nhất:

1. Mục tiêu và kết quả bàn giao.
2. Phạm vi thực hiện và những nội dung không thuộc phạm vi.
3. Người quản lý dự án, người thực hiện và người kiểm tra kết quả.
4. Thời gian dự kiến và các mốc quan trọng.
5. Cách phân loại hạng mục, trạng thái và mức ưu tiên.
6. Ai được xem, tham gia và chỉnh sửa dự án.

**Kết quả cần có:** đủ thông tin để người mới đọc mô tả và hiểu dự án đang làm gì, ai phụ trách, khi nào hoàn thành.

## 3. Tạo dự án mới

### 3.1. Các bước thao tác

1. Mở **Dự án** trong module.
2. Chọn nút tạo/thêm dự án để mở biểu mẫu **Tạo dự án**.
3. Nhập **Tên dự án** rõ ràng, ví dụ `Chuẩn hóa đối soát chuyến xe`.
4. Nhập hoặc kiểm tra **Mã/ID dự án**. Nên dùng chữ cái Latin viết hoa và số, không có khoảng trắng, dài từ **1 đến 10 ký tự**, ví dụ `DOISOAT`.
5. Nhập **Mô tả** theo mẫu ở mục 3.2.
6. Chọn biểu tượng hoặc màu nhận diện nếu biểu mẫu có lựa chọn này.
7. Kiểm tra các tùy chọn quyền truy cập được hiển thị. Nếu không có trong biểu mẫu, cấu hình sau khi tạo ở cài đặt dự án.
8. Bấm **Tạo dự án**, chờ thông báo thành công.
9. Mở dự án vừa tạo để kiểm tra tên, mã và mô tả.

Tên dự án hỗ trợ tiếng Việt. Mã dự án dùng trong mã công việc, chẳng hạn `DOISOAT-1`; phần số do hệ thống sinh, người dùng không cần tự đánh số đầu việc.

Nếu biểu mẫu báo mã không hợp lệ hoặc trùng, sửa mã theo thông báo rồi gửi lại. Không bấm tạo liên tục khi hệ thống đang xử lý.

### 3.2. Mẫu mô tả dự án

```text
Mục tiêu:
Chuẩn hóa việc đối soát chuyến xe và giảm sai lệch dữ liệu báo cáo.

Phạm vi:
Thu thập dữ liệu, đối chiếu số liệu, xác minh chênh lệch và bàn giao báo cáo.

Không thuộc phạm vi:
Thay đổi chính sách thanh toán hoặc sửa hệ thống ngoài kế hoạch.

Người quản lý:
[Tên nhân sự]

Người kiểm tra kết quả:
[Tên nhân sự / bộ phận]

Thời gian dự kiến:
[Ngày bắt đầu] đến [Ngày hoàn thành]

Điều kiện hoàn tất:
- Các nguồn dữ liệu được thống nhất.
- Chênh lệch được xác minh hoặc có giải trình.
- Báo cáo được kiểm tra và bàn giao.

Tài liệu liên quan:
[Liên kết quy trình / biểu mẫu / tài liệu]
```

### 3.3. Quyền truy cập và chia sẻ

Nếu cài đặt hiển thị lựa chọn **Công khai/Riêng tư**, đây là phạm vi truy cập dự án trong không gian làm việc theo quyền của hệ thống. **Không đồng nhất dự án công khai với việc xuất bản nội dung lên Internet.** Xuất bản/chia sẻ bên ngoài là hành động riêng, chỉ thực hiện khi đã xác định đúng phạm vi thông tin cần chia sẻ.

Với dự án có dữ liệu nội bộ hoặc chỉ một nhóm tham gia, chọn phạm vi hạn chế phù hợp và thêm đúng thành viên.

## 4. Thiết lập dự án và thành viên

### 4.1. Mở cài đặt

Từ dự án đang mở, chọn menu **…**, biểu tượng cài đặt hoặc mục cài đặt dự án được hiển thị. Nếu không tìm thấy, mở phần cài đặt của không gian làm việc và chọn dự án cần cấu hình.

Kiểm tra lần lượt: thông tin chung, thành viên, tính năng, trạng thái và nhãn. Các thao tác quản trị chỉ thực hiện được khi tài khoản có quyền tương ứng.

### 4.2. Thêm thành viên

1. Mở phần **Thành viên** của dự án.
2. Chọn thêm/mời thành viên theo nút đang hiển thị.
3. Tìm theo tên hoặc email công việc.
4. Chọn đúng nhân sự đã được đồng bộ từ XBus.
5. Gán vai trò dự án phù hợp trong các lựa chọn được cung cấp.
6. Lưu hoặc gửi lời mời. Nếu có lời mời chờ xử lý, kiểm tra trạng thái tham gia thay vì coi người được mời đã là thành viên.
7. Yêu cầu nhân sự xác nhận họ mở được dự án và thấy công việc cần thực hiện.

Không tạo tài khoản riêng trùng với nhân sự XBus để khắc phục lỗi giao việc. Nếu không tìm thấy người, thực hiện hướng dẫn ở mục 19.

### 4.3. Phân công vai trò nghiệp vụ

| Vai trò nghiệp vụ đề xuất | Trách nhiệm                                                 |
| ------------------------- | ----------------------------------------------------------- |
| Người quản lý dự án       | Phạm vi, kế hoạch, phân công, điều phối và rà soát tiến độ  |
| Người thực hiện           | Làm công việc, cập nhật trạng thái, thời hạn và kết quả     |
| Người kiểm tra/nghiệm thu | Đối chiếu tiêu chí hoàn thành, phản hồi và xác nhận kết quả |
| Người theo dõi            | Đọc tiến độ, trao đổi và nhận thông tin theo quyền được cấp |

Các vai trò này là cách đội ngũ phân công trách nhiệm. Chúng không nhất thiết tương ứng với một trường hoặc vai trò quyền hạn riêng trong giao diện.

### 4.4. Bật tính năng cần dùng

Trong cài đặt **Tính năng**, bật những mục phục vụ quy trình:

- **Chu kỳ:** quản lý công việc theo tuần, sprint hoặc đợt thực hiện.
- **Nhóm công việc:** quản lý các hạng mục lớn và người phụ trách hạng mục.
- **Chế độ xem:** lưu bộ lọc và cách hiển thị để dùng lại.
- **Trang:** lưu mô tả, quy trình, biên bản và tài liệu dự án.
- **Tiếp nhận:** rà soát yêu cầu trước khi đưa vào luồng công việc chính.

Sau khi bật, mở lại dự án để kiểm tra mục tương ứng. Không cần bật tất cả tính năng cho một dự án nhỏ.

## 5. Thiết lập trạng thái, nhãn và ước lượng

### 5.1. Hiểu nhóm trạng thái

Các tên mặc định đang được hiển thị bằng tiếng Việt:

| Trạng thái mặc định  | Ý nghĩa sử dụng                                    |
| -------------------- | -------------------------------------------------- |
| **Chờ lên kế hoạch** | Đã ghi nhận nhưng chưa cam kết thực hiện           |
| **Cần làm**          | Đã làm rõ, sẵn sàng bắt đầu                        |
| **Đang thực hiện**   | Người phụ trách đã bắt đầu xử lý                   |
| **Hoàn thành**       | Kết quả đáp ứng tiêu chí hoàn thành đã thống nhất  |
| **Đã hủy**           | Không tiếp tục thực hiện; giữ lại lý do và lịch sử |

Tên do dự án tự tạo được giữ theo cấu hình. Khi cấu hình trạng thái, cần chọn đúng **nhóm trạng thái** bên cạnh tên: một trạng thái mang tên “Đã duyệt” nhưng nằm trong nhóm đang thực hiện sẽ không được thống kê giống nhóm hoàn thành.

### 5.2. Thêm trạng thái phù hợp quy trình

1. Mở cài đặt **Trạng thái** của dự án.
2. Chọn nhóm phù hợp, rồi thêm trạng thái.
3. Nhập tên và chọn màu nhận diện.
4. Lưu, kiểm tra lựa chọn mới trong công việc.
5. Nếu có tùy chọn đặt trạng thái mặc định, chọn trạng thái phù hợp cho việc mới.

Ví dụ, thêm **Chờ kiểm tra** vào nhóm đang thực hiện, dùng trước khi chuyển sang hoàn thành. Nếu thêm **Bị chặn**, đội ngũ cần thống nhất cách sử dụng; trạng thái này không mặc nhiên thông báo hoặc chuyển việc cho người khác.

Luồng đề xuất:

```text
Chờ lên kế hoạch → Cần làm → Đang thực hiện → Chờ kiểm tra → Hoàn thành
```

Khi không thực hiện nữa, chuyển sang **Đã hủy** và ghi lý do. Không dùng “Đã hủy” như một bước bắt buộc sau “Hoàn thành”.

### 5.3. Chuẩn hóa nhãn

1. Mở phần **Nhãn** trong cài đặt dự án.
2. Tạo các nhãn phục vụ phân loại, chọn màu dễ phân biệt.
3. Giải thích cách dùng trong tài liệu dự án.
4. Gắn nhãn khi tạo hoặc sửa công việc.

Ví dụ: `Vận hành`, `Dữ liệu`, `Báo cáo`, `Sự cố`, `Cần kiểm tra`. Tên chuyên ngành như `Backend`, `Frontend`, `API` có thể giữ nguyên khi phù hợp.

Không dùng nhãn để thay thế trạng thái hoặc người phụ trách. Tránh tạo đồng thời `Cần duyệt`, `Chờ duyệt` và `Đợi duyệt` nếu chúng cùng một ý nghĩa.

### 5.4. Ước lượng khối lượng

Nếu dự án bật ước lượng, người quản lý thống nhất thang điểm và cách đánh giá trước khi giao việc. Khi nhập **Ước lượng**, chọn giá trị theo thang đó.

Điểm ước lượng thể hiện quy ước khối lượng/độ khó của đội ngũ, không tự động tương đương số giờ làm hoặc chi phí. Không so sánh điểm giữa các đội dùng thang khác nhau.

## 6. Tạo, giao và chỉnh sửa công việc

### 6.1. Tạo công việc trong đúng dự án

1. Mở dự án và chọn **Công việc**.
2. Bấm **Thêm công việc**, hoặc dùng nút thêm nhanh trong nhóm.
3. Kiểm tra dự án trong biểu mẫu, đặc biệt khi tạo từ nút **Công việc mới** ở sidebar.
4. Nhập tiêu đề và mô tả.
5. Chọn trạng thái, người phụ trách, ưu tiên và thời hạn.
6. Gắn nhãn, chu kỳ, nhóm công việc và ước lượng nếu cần.
7. Bấm nút tạo/lưu công việc đang hiển thị.
8. Kiểm tra công việc xuất hiện trong danh sách, mở lại để xác nhận thông tin.

Tạo nhanh phù hợp để ghi nhận tiêu đề trước. Sau đó cần mở chi tiết để bổ sung người phụ trách, thời hạn và tiêu chí hoàn thành; không xem một dòng tiêu đề là kế hoạch đã đầy đủ.

### 6.2. Cách điền từng trường

| Trường                    | Cách nhập                                                  | Ví dụ                                                     |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| **Tiêu đề/Tên công việc** | Mô tả một kết quả cụ thể, dễ kiểm tra                      | Xác minh chênh lệch dữ liệu tuyến A                       |
| **Mô tả**                 | Bối cảnh, phạm vi, đầu vào, kết quả và tiêu chí hoàn thành | Đối chiếu hai nguồn dữ liệu; lập bảng các dòng chênh lệch |
| **Trạng thái**            | Đúng giai đoạn thực tế                                     | Cần làm                                                   |
| **Người phụ trách**       | Nhân sự chịu trách nhiệm thực hiện                         | Nhân sự được chọn từ danh sách dự án                      |
| **Ưu tiên**               | Mức cần xử lý so với các việc khác                         | Cao                                                       |
| **Ngày bắt đầu**          | Ngày dự kiến triển khai                                    | Ngày đầu của đợt đối soát                                 |
| **Hạn hoàn thành**        | Ngày phải có kết quả                                       | Ngày trước hạn gửi báo cáo                                |
| **Nhãn**                  | Đặc điểm phục vụ tìm kiếm và báo cáo                       | Dữ liệu, Vận hành                                         |
| **Chu kỳ**                | Đợt thực hiện đã được thống nhất                           | Đợt 1 — Tuần 1                                            |
| **Nhóm công việc**        | Hạng mục chứa đầu việc                                     | Xác minh chênh lệch                                       |
| **Ước lượng**             | Khối lượng theo quy ước của đội                            | Một giá trị trong thang điểm đã cấu hình                  |

Mức ưu tiên gồm **Không có**, **Thấp**, **Trung bình**, **Cao**, **Khẩn cấp**. Ưu tiên không thay thế thời hạn; hạn gần cũng không tự biến một việc thành khẩn cấp.

### 6.3. Mẫu mô tả công việc

```text
Bối cảnh:
Báo cáo tuyến A đang có chênh lệch giữa dữ liệu vận hành và dữ liệu tổng hợp.

Phạm vi:
Kiểm tra dữ liệu trong khoảng [ngày bắt đầu] đến [ngày kết thúc].

Đầu vào:
[Liên kết nguồn dữ liệu / tệp / công việc liên quan]

Các bước chính:
1. Thu thập hai nguồn dữ liệu.
2. Đối chiếu theo mã chuyến và ngày hoạt động.
3. Xác minh từng chênh lệch với người liên quan.

Kết quả bàn giao:
Bảng đối chiếu và giải trình các chênh lệch.

Tiêu chí hoàn thành:
- Kiểm tra đủ các chuyến trong phạm vi.
- Mỗi chênh lệch có nguyên nhân hoặc người tiếp tục xử lý.
- Người kiểm tra xác nhận kết quả đáp ứng yêu cầu.

Người kiểm tra:
[Tên nhân sự]
```

### 6.4. Giao việc và xác nhận nhận việc

1. Người quản lý chọn người phụ trách, thời hạn và mức ưu tiên.
2. Ghi rõ người chịu trách nhiệm chính nếu công việc có nhiều người phụ trách.
3. Người được giao mở **Công việc của tôi** trong module hoặc dự án để kiểm tra đầu việc.
4. Nếu yêu cầu chưa rõ hoặc thời hạn chưa khả thi, trao đổi trong bình luận trước khi bắt đầu.
5. Khi thực sự triển khai, chuyển trạng thái sang **Đang thực hiện**.

Trường người phụ trách cho phép nhiều người ở các màn hình hỗ trợ, nhưng đội ngũ vẫn nên xác định một người chịu trách nhiệm chính về kết quả. Việc gán tên không phải bằng chứng rằng người đó đã đọc hoặc chấp nhận thời hạn.

### 6.5. Chỉnh sửa sau khi tạo

1. Bấm tên công việc để mở chi tiết.
2. Sửa tiêu đề, mô tả hoặc thuộc tính cần thay đổi.
3. Với trường có nút lưu, bấm lưu; với bộ chọn thuộc tính, kiểm tra giá trị sau khi chọn và thông báo hệ thống.
4. Ghi bình luận nếu thay đổi ảnh hưởng đến phạm vi, người phụ trách hoặc ngày hoàn thành.
5. Đóng bảng chi tiết và xác nhận danh sách phản ánh thông tin mới.

Không coi dữ liệu đã được lưu nếu hệ thống báo lỗi. Nếu có người cùng chỉnh sửa, tải lại chi tiết trước khi ghi đè nội dung dài.

### 6.6. Ngày bắt đầu và hạn hoàn thành

- Dùng cả hai ngày cho công việc kéo dài nhiều ngày hoặc cần hiển thị rõ trên Gantt.
- Hạn hoàn thành không nên trước ngày bắt đầu.
- Ngày của công việc và khoảng ngày của chu kỳ là hai thông tin riêng; thêm vào chu kỳ không tự đặt toàn bộ ngày cho công việc.
- Thay đổi hạn khi có kế hoạch mới, đồng thời ghi lý do và xác nhận với người quản lý.
- Nếu chưa đủ thông tin để cam kết, để ở trạng thái chờ lên kế hoạch; không đặt ngày tùy ý chỉ để lấp trường trống.

### 6.7. Bình luận, nhắc người và tệp đính kèm

Trong chi tiết công việc:

1. Mở phần bình luận/hoạt động.
2. Viết nội dung có kết quả, vấn đề và hành động tiếp theo.
3. Dùng `@` và chọn đúng nhân sự khi cần trao đổi trực tiếp.
4. Thêm tệp hoặc liên kết kết quả nếu giao diện cung cấp.
5. Gửi bình luận và kiểm tra nội dung đã xuất hiện.

Mẫu cập nhật:

```text
Đã làm: đối chiếu xong 80/100 chuyến.
Còn lại: 20 chuyến thiếu xác nhận từ nguồn dữ liệu B.
Vướng mắc: chưa nhận được tệp cập nhật.
Cần hỗ trợ: [Tên nhân sự] cung cấp tệp trước [thời điểm].
Dự kiến tiếp theo: hoàn tất đối chiếu và gửi bảng kết quả.
```

Lịch sử hoạt động hỗ trợ truy vết thay đổi thuộc tính. Bình luận dùng để giải thích quyết định; tránh chỉ ghi “đã làm” khi không có kết quả kiểm chứng.

## 7. Chia việc con và quản lý quan hệ giữa công việc

### 7.1. Tạo Subtask

1. Mở công việc cha.
2. Tìm mục **Subtask** hoặc nút hành động **Thêm Subtask**.
3. Nhập tên một bước có kết quả riêng.
4. Chọn người phụ trách, trạng thái và thời hạn.
5. Tạo và kiểm tra Subtask được liên kết đúng công việc cha.
6. Lặp lại cho các bước cần theo dõi độc lập.

Ví dụ công việc cha `Hoàn thiện báo cáo đối soát` có các Subtask: thu thập dữ liệu, đối chiếu, xác minh sai lệch, tổng hợp báo cáo.

Hoàn thành các Subtask không thay thế việc kiểm tra kết quả của công việc cha. Người phụ trách công việc cha vẫn phải rà soát và cập nhật trạng thái của nó.

### 7.2. Khi nào tách thành công việc ngang cấp?

Tách thành công việc riêng và gom bằng nhóm công việc khi mỗi phần có phạm vi lớn, thời hạn riêng, nhiều người tham gia hoặc cần báo cáo độc lập. Không tạo cây việc con quá sâu làm mất khả năng theo dõi.

### 7.3. Quan hệ và phụ thuộc

Nếu chi tiết có mục quan hệ, chọn loại phù hợp và tìm công việc liên quan bằng tên/mã. Ví dụ, công việc tổng hợp báo cáo **bị chặn bởi** việc thu thập dữ liệu.

Sau khi liên kết, mở lại hai công việc để kiểm tra đúng chiều quan hệ. Quan hệ giúp người quản lý nhận biết phụ thuộc; vẫn cần trao đổi về thời hạn và kiểm tra lịch khi một việc thay đổi. Không mặc định mọi công việc liên quan sẽ tự đổi ngày hoặc trạng thái.

## 8. Lập kế hoạch theo nhóm công việc

### 8.1. Mục đích

**Nhóm công việc** dùng để gom hạng mục trong một dự án, chẳng hạn `Thu thập dữ liệu`, `Xác minh chênh lệch`, `Báo cáo và bàn giao`. Nhóm có thể có ngày dự kiến, người dẫn dắt và thành viên riêng.

### 8.2. Tạo nhóm

1. Bật **Nhóm công việc** trong tính năng dự án nếu chưa có.
2. Mở mục **Nhóm công việc** của dự án.
3. Chọn tạo nhóm mới.
4. Nhập tên và mô tả phạm vi.
5. Đặt khoảng ngày dự kiến nếu cần.
6. Chọn người phụ trách nhóm và thành viên.
7. Lưu, mở nhóm vừa tạo để kiểm tra.

### 8.3. Thêm công việc vào nhóm

Có hai cách tùy màn hình:

- Mở nhóm, dùng hành động tạo công việc hoặc thêm công việc hiện có.
- Mở chi tiết công việc, chọn thuộc tính **Nhóm công việc** và chọn nhóm cần gắn.

Sau khi thêm, kiểm tra danh sách và tiến độ của nhóm. Gắn nhóm không tự giao mọi công việc cho người dẫn dắt nhóm.

### 8.4. Rà soát nhóm

Người dẫn dắt nhóm kiểm tra các việc chưa có người phụ trách, quá hạn, bị chặn và kết quả đã hoàn thành. Khi bỏ một việc khỏi nhóm, xác nhận chỉ bỏ liên kết nhóm hay đang chọn xóa công việc; đây là hai hành động khác nhau.

## 9. Lập kế hoạch theo chu kỳ

### 9.1. Mục đích

**Chu kỳ** là khoảng thời gian cam kết thực hiện một tập công việc. Có thể dùng chu kỳ một tuần, hai tuần hoặc theo từng đợt vận hành; không bắt buộc mọi dự án dùng sprint.

### 9.2. Tạo chu kỳ

1. Bật **Chu kỳ** trong tính năng dự án.
2. Mở **Chu kỳ** và chọn tạo mới.
3. Nhập tên dễ phân biệt, ví dụ `Đợt 1 — Tuần 1`.
4. Nhập mô tả mục tiêu của đợt.
5. Chọn ngày bắt đầu và ngày kết thúc hợp lý.
6. Lưu chu kỳ.
7. Nếu hệ thống báo khoảng ngày không hợp lệ hoặc chồng lấn, điều chỉnh theo thông báo trước khi gửi lại.

### 9.3. Chọn công việc vào chu kỳ

1. Rà soát danh sách chờ lên kế hoạch.
2. Chọn việc có mô tả và tiêu chí hoàn thành đủ rõ.
3. Xác nhận người phụ trách và năng lực thực hiện trong đợt.
4. Từ chu kỳ, thêm công việc hiện có; hoặc đặt thuộc tính **Chu kỳ** trong chi tiết công việc.
5. Kiểm tra danh sách chu kỳ và bổ sung ngày, ưu tiên, ước lượng còn thiếu.

Không đưa tất cả việc tồn đọng vào chu kỳ chỉ để làm danh sách trông đầy đủ. Công việc chưa rõ yêu cầu nên tiếp tục được làm rõ trước.

### 9.4. Trong và cuối chu kỳ

Trong chu kỳ, theo dõi việc đang làm, việc bị chặn và khả năng đạt mục tiêu. Nếu phát sinh thêm việc, ghi rõ tác động đến kế hoạch đã cam kết.

Cuối chu kỳ:

1. Rà soát kết quả của các việc hoàn thành.
2. Xác định việc chưa xong, nguyên nhân và phần còn lại.
3. Nếu có hành động chuyển công việc chưa hoàn thành sang chu kỳ khác, chọn đúng chu kỳ đích và xác nhận danh sách sau khi chuyển.
4. Nếu không dùng thao tác chuyển hàng loạt, cập nhật chu kỳ của từng công việc cần lập kế hoạch lại.
5. Ghi tổng kết kết quả, điểm nghẽn và thay đổi cho đợt tiếp theo.

Không đánh dấu hoàn thành một công việc chưa đạt yêu cầu chỉ vì chu kỳ đã kết thúc.

## 10. Sử dụng các kiểu xem công việc

Phiên bản hiện tại có các kiểu **Danh sách**, **Bảng Kanban**, **Lịch**, **Bảng tính** và **Gantt**. Chúng là các cách xem cùng dữ liệu, không phải năm danh sách công việc độc lập.

Ở màn hình công việc, rê chuột lên bộ biểu tượng để đọc tên rồi chọn kiểu xem. **Hiển thị** điều chỉnh các thuộc tính và lựa chọn phù hợp với kiểu đang mở.

### 10.1. Danh sách

Phù hợp để đọc tên, trạng thái, người phụ trách và thời hạn của nhiều công việc.

1. Chọn biểu tượng danh sách.
2. Mở **Hiển thị**, chọn thuộc tính muốn thấy.
3. Chọn cách nhóm và sắp xếp nếu có.
4. Mở rộng/thu gọn nhóm để tập trung vào phần cần xử lý.
5. Bấm tên để xem chi tiết; bấm thuộc tính để chỉnh nếu được phép.
6. Dùng dòng thêm nhanh hoặc dấu **+** của nhóm để tạo việc mới, rồi kiểm tra lại trạng thái và các trường còn thiếu.

Nếu không thấy nhóm rỗng, kiểm tra tùy chọn hiển thị nhóm rỗng; không coi một nhóm bị ẩn là trạng thái đã bị xóa.

### 10.2. Bảng Kanban

Phù hợp để điều phối luồng công việc theo các cột.

1. Chọn biểu tượng bảng.
2. Nhóm theo **Trạng thái** để theo dõi tiến độ phổ biến nhất.
3. Kéo thẻ sang cột khác khi trạng thái thực tế thay đổi và quyền cho phép.
4. Kiểm tra thẻ đã nằm đúng cột sau khi thả.
5. Mở thẻ để cập nhật mô tả, bình luận, người phụ trách và thời hạn.

Khi đang nhóm theo người phụ trách, ưu tiên hoặc thuộc tính khác, ý nghĩa kéo thả có thể khác hoặc không được hỗ trợ. Luôn đọc tiêu đề cột; không mặc định mọi lần kéo thẻ đều đổi trạng thái.

### 10.3. Bảng tính

Phù hợp để đối chiếu các trường giữa nhiều công việc.

1. Chọn biểu tượng bảng tính.
2. Bật các cột cần so sánh trong **Hiển thị**.
3. Dùng bộ lọc để giới hạn danh sách.
4. Chỉnh thuộc tính ngay trong ô khi màn hình cho phép.
5. Mở chi tiết đối với nội dung mô tả dài hoặc trao đổi.

Tránh thay đổi hàng loạt các trường chỉ để sắp xếp giao diện. Nếu có thao tác chọn nhiều công việc, đọc kỹ hành động trước khi xác nhận.

### 10.4. Lịch

Phù hợp để rà soát công việc theo ngày và nhận biết lịch tập trung quá nhiều đầu việc.

1. Chọn biểu tượng lịch.
2. Điều hướng đến khoảng thời gian cần xem.
3. Mở công việc trên lịch để kiểm tra ngày và chi tiết.
4. Khi thao tác kéo đổi ngày được cung cấp và quyền cho phép, kiểm tra hạn sau khi thả.

Công việc không có ngày phù hợp có thể không xuất hiện trong vùng lịch. Quay lại danh sách để bổ sung ngày trước khi kết luận công việc bị mất.

### 10.5. Gantt

Phù hợp để theo dõi khoảng thời gian của công việc và các quan hệ phụ thuộc được hỗ trợ.

1. Chọn biểu tượng Gantt.
2. Kiểm tra công việc có ngày bắt đầu và hạn hoàn thành.
3. Chọn khoảng thời gian hoặc mức xem được cung cấp để đọc kế hoạch.
4. Bấm thanh công việc để mở chi tiết.
5. Nếu có quyền, dùng thao tác kéo/điều chỉnh thanh theo giao diện để đổi lịch; kiểm tra lại hai ngày sau khi thao tác.
6. Rà soát quan hệ phụ thuộc, công việc chồng thời gian và thời hạn bàn giao.

Công việc chỉ có một ngày có thể hiển thị khác công việc có đủ khoảng ngày. Không dùng độ dài thanh để kết luận khối lượng nếu dữ liệu ngày chưa đầy đủ.

**Phân tích** hiện là chức năng mở từ nút hoặc mục phân tích; tài liệu không giả định có tab Dashboard hay Timeline riêng trong bộ kiểu xem này.

## 11. Tìm kiếm, lọc, nhóm, sắp xếp và lưu chế độ xem

### 11.1. Tìm công việc

1. Dùng chức năng tìm kiếm trong phạm vi đang mở.
2. Nhập tên hoặc mã, ví dụ `DOISOAT-3` — đây là mã minh họa.
3. Kiểm tra dự án và tiêu đề của kết quả trước khi mở.
4. Nếu không thấy, kiểm tra bộ lọc, dữ liệu lưu trữ và quyền truy cập.

### 11.2. Lọc danh sách

1. Mở bộ lọc.
2. Chọn thuộc tính và điều kiện được cung cấp, chẳng hạn người phụ trách, trạng thái, ưu tiên, nhãn hoặc ngày.
3. Chọn giá trị rồi kiểm tra danh sách kết quả.
4. Thêm điều kiện nếu cần; đọc cách kết hợp điều kiện khi dùng bộ lọc nâng cao.
5. Xóa hoặc bỏ điều kiện khi muốn trở lại danh sách rộng hơn.

Ví dụ các danh sách nên tạo:

| Nhu cầu                      | Điều kiện cần thiết lập                                       |
| ---------------------------- | ------------------------------------------------------------- |
| Việc của tôi đang xử lý      | Người phụ trách là mình; trạng thái thuộc nhóm đang thực hiện |
| Việc chưa giao               | Người phụ trách trống                                         |
| Việc quá hạn chưa hoàn thành | Hạn trước hôm nay; loại trừ nhóm hoàn thành và đã hủy         |
| Việc cần kiểm tra            | Trạng thái Chờ kiểm tra hoặc nhãn được đội ngũ quy ước        |
| Sự cố ưu tiên cao            | Nhãn Sự cố; ưu tiên Cao/Khẩn cấp; chưa hoàn thành             |
| Việc của đợt hiện tại        | Chu kỳ là đợt đang triển khai                                 |

Tên toán tử và khả năng kết hợp phụ thuộc bộ lọc trên màn hình. Bảng trên mô tả điều kiện nghiệp vụ cần đạt, không phải tên một mẫu có sẵn.

### 11.3. Nhóm và sắp xếp

Trong **Hiển thị**, dùng các lựa chọn được hỗ trợ:

- Nhóm theo trạng thái để xem luồng xử lý.
- Nhóm theo người phụ trách để rà soát phân công.
- Nhóm theo ưu tiên hoặc nhóm công việc để tập trung hạng mục.
- Sắp xếp theo hạn, ưu tiên, ngày tạo hoặc thứ tự được cung cấp.

Nhóm/sắp xếp thay đổi cách đọc dữ liệu; không tự đổi hạn, ưu tiên hoặc người thực hiện. Một số cách sắp xếp không hỗ trợ kéo để thay đổi thứ tự thủ công.

### 11.4. Lưu chế độ xem

1. Bật **Chế độ xem** của dự án nếu cần.
2. Thiết lập bộ lọc và cách hiển thị mong muốn.
3. Dùng hành động lưu thành chế độ xem, hoặc mở **Chế độ xem** của dự án để tạo mới.
4. Đặt tên thể hiện đúng phạm vi, ví dụ `DOISOAT — Việc quá hạn`.
5. Chọn phạm vi/quyền truy cập nếu biểu mẫu có lựa chọn.
6. Lưu, mở lại để kiểm tra đúng các điều kiện.

Phân biệt chế độ xem của một dự án với chế độ xem ở cấp không gian làm việc. Chia sẻ một chế độ xem không tự cấp quyền đọc mọi dự án bên trong nó.

## 12. Thực hiện, báo cáo tiến độ và nghiệm thu

### 12.1. Quy trình chung

| Bước                   | Người thực hiện                    | Thao tác trên hệ thống                                           | Điều kiện chuyển bước                         |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Ghi nhận               | Người tạo/người quản lý            | Tạo công việc, ghi yêu cầu                                       | Có một kết quả cần theo dõi                   |
| Làm rõ và lập kế hoạch | Người quản lý cùng người phụ trách | Bổ sung mô tả, hạn, ưu tiên; chọn nhóm/chu kỳ                    | Yêu cầu đủ rõ và có người chịu trách nhiệm    |
| Triển khai             | Người phụ trách                    | Chuyển Đang thực hiện; cập nhật tiến độ                          | Đã bắt đầu xử lý thực tế                      |
| Gửi kiểm tra           | Người phụ trách                    | Đính kèm kết quả, bình luận, chuyển Chờ kiểm tra nếu đã cấu hình | Có kết quả để đối chiếu                       |
| Kiểm tra               | Người được phân công kiểm tra      | Đọc kết quả, phản hồi trong bình luận                            | Đạt tiêu chí hoặc cần bổ sung                 |
| Hoàn tất               | Người có trách nhiệm cập nhật      | Chuyển Hoàn thành, ghi xác nhận                                  | Kết quả đạt tiêu chí đã thống nhất            |
| Tổng kết               | Người quản lý                      | Rà soát chu kỳ/nhóm/dự án                                        | Đủ kết quả và các việc tồn đọng đã được xử lý |

Nếu cần hệ thống bắt buộc duyệt trước khi hoàn thành, Admin chọn người nghiệm thu trong mục **Nghiệm thu** theo mục 12.4. Khi chưa cấu hình, người kiểm tra ghi trong mô tả, bình luận hoặc tài liệu chỉ là phân công nghiệp vụ.

### 12.2. Gửi công việc để kiểm tra

1. Người thực hiện rà soát các tiêu chí hoàn thành.
2. Gắn tệp hoặc liên kết kết quả.
3. Bình luận tóm tắt đã làm, phần chưa làm và cách kiểm tra.
4. Nhắc người kiểm tra theo phân công.
5. Chuyển sang **Chờ kiểm tra** nếu dự án đã cấu hình; nếu chưa, giữ trạng thái phù hợp và ghi rõ trong bình luận.

Không tự coi việc gửi một tệp là hoàn thành khi vẫn còn yêu cầu chưa đạt.

### 12.3. Kiểm tra đạt hoặc chưa đạt

**Nếu đạt:** ghi nhận kết quả kiểm tra, xác nhận các tiêu chí và chuyển công việc sang nhóm hoàn thành theo quy ước của đội.

**Nếu chưa đạt:** ghi từng điểm cần bổ sung, người xử lý và thời hạn mới nếu cần. Chuyển lại **Đang thực hiện** hoặc trạng thái phù hợp. Người phụ trách bổ sung trên cùng công việc để giữ lịch sử, trừ khi phần phát sinh là yêu cầu mới có phạm vi độc lập.

### 12.4. Nghiệm thu có kiểm tra quyền — bản tùy chỉnh XBus

Sau khi triển khai bản backend/frontend mới, mục **Nghiệm thu** xuất hiện trong chi tiết đầy đủ và bảng xem nhanh. Các hướng dẫn nghiệm thu thủ công ở trên áp dụng cho công việc chưa bật tính năng này. Khi Admin chọn người nghiệm thu, hệ thống bắt buộc duyệt trước khi hoàn thành.

1. Admin không gian làm việc hoặc Admin dự án mở công việc chưa hoàn thành/chưa hủy.
2. Trong mục **Nghiệm thu**, chọn thành viên dự án đang hoạt động rồi bấm **Lưu người nghiệm thu**.
3. Người phụ trách hoặc Admin ghi kết quả, liên kết bàn giao và cách kiểm tra, bấm **Gửi kiểm tra**. Nhãn nghiệm thu chuyển sang **Chờ nghiệm thu**, độc lập với trạng thái công việc.
4. Người nghiệm thu hoặc Admin đọc kết quả, nhập nhận xét bắt buộc và chọn **Duyệt hoàn thành** hoặc **Trả lại**.
5. Khi duyệt, công việc chuyển sang nhóm Hoàn thành; khi trả lại, chuyển về nhóm Đang thực hiện với nhãn **Cần bổ sung**. Người phụ trách bổ sung rồi gửi kiểm tra lại.
6. Mở **Lịch sử nghiệm thu** để xem người thao tác, thời gian và nhận xét.

Quy tắc của bản đầu tiên:

- Chỉ công việc được chọn người nghiệm thu mới bị kiểm soát; công việc cũ chưa cấu hình vẫn dùng luồng thông thường.
- Thành viên không được giao việc không thể gửi kiểm tra; chỉ người nghiệm thu hoặc Admin được duyệt/trả lại.
- Đổi người nghiệm thu yêu cầu gửi kiểm tra lại và giữ lịch sử. Chưa có thao tác tắt nghiệm thu sau khi bật.
- Sửa tên hoặc mô tả sau khi gửi làm yêu cầu trở về **Chưa gửi kiểm tra**. Công việc đã hoàn thành cần mở lại trước khi sửa các nội dung này; mở lại sẽ yêu cầu nghiệm thu lại.
- Người bị vô hiệu hóa hoặc rời dự án mất quyền nghiệm thu. Admin có thể đổi người nghiệm thu hoặc duyệt yêu cầu đang chờ.
- Công việc lưu trữ cần khôi phục trước khi thao tác. Dự án cần trạng thái thuộc nhóm Hoàn thành và Đang thực hiện.
- Chưa có thông báo riêng cho sự kiện nghiệm thu. Thay đổi tệp/bình luận không tự vô hiệu hóa yêu cầu; người kiểm tra cần đối chiếu đúng phiên bản kết quả.
- Đây là quyền theo hành động nghiệm thu, chưa phải bộ công cụ tạo vai trò và phân quyền tùy chỉnh cho mọi thao tác.

### 12.5. Cấu hình Workflow của dự án — bản tùy chỉnh XBus

Trong sidebar, mở rộng dự án và chọn **Cài đặt dự án → Workflow**. Trang danh sách hiển thị công tắc bật/tắt và bảng workflow; bấm **Workflow mặc định** để mở cấu hình chi tiết. Thành viên có thể xem; Admin dự án hoặc không gian làm việc được sửa. Bản đầu tiên có một Workflow mặc định áp dụng cho dự án.

1. Mở từng trạng thái trong **Định nghĩa workflow**. Nếu dự án thiếu nhóm trạng thái, Admin có thể dùng nút bổ sung đủ năm nhóm; tên và quy tắc hiện có được giữ lại.
2. Chọn **Cho phép tạo công việc mới ở trạng thái này** cho các trạng thái đầu vào. Khi bắt buộc nghiệm thu, không thể tạo việc thẳng ở nhóm Hoàn thành.
3. Chọn **Thêm luồng chuyển bước**, chọn trạng thái đích và người được chuyển: tất cả thành viên, Admin, người được giao, người nghiệm thu hoặc thành viên cụ thể. Bấm **Lưu luồng** để lưu ngay. Menu **…** của luồng cho phép sửa hoặc xóa; không có luồng nghĩa là chặn bước đó, kể cả Admin.
4. Quyền **Người nghiệm thu** sử dụng qua thao tác Duyệt/Trả lại ở mục Nghiệm thu. Công việc vẫn cần Admin chọn người nghiệm thu theo mục 12.4.
5. Bật **Bắt buộc nghiệm thu trước khi Hoàn thành** nếu muốn áp dụng cho mọi công việc trong dự án. Việc chưa có người nghiệm thu sẽ không thể chuyển sang Hoàn thành cho đến khi được cấu hình và duyệt.
6. Trong trang chi tiết, bấm **Lưu thay đổi** sau khi chỉnh quy tắc. Quay lại danh sách và bật **Bật workflow**; công tắc tự lưu và chỉ phản ánh giá trị mới sau khi lưu thành công. Cần ít nhất một trạng thái cho phép tạo việc mới.
7. Thử tạo việc và chuyển trạng thái bằng tài khoản có quyền tương ứng. Quy tắc áp dụng ở backend cho thao tác tạo/cập nhật; không chỉ giới hạn giao diện.

Lưu ý:

- Khi workflow tắt, các giới hạn chuyển bước của dự án không áp dụng; những công việc đã bật nghiệm thu riêng vẫn phải được duyệt.
- Quy tắc bắt buộc nghiệm thu bổ sung cho quyền chuyển bước. Chọn quyền Thành viên sang Hoàn thành không cho phép bỏ qua nghiệm thu.
- Bước Trả lại dùng trạng thái đầu tiên thuộc nhóm Đang thực hiện; cần cho phép bước từ trạng thái hiện tại tới trạng thái đó cho Admin/người nghiệm thu tương ứng.
- Thêm, xóa hoặc đổi trạng thái ở mục Trạng thái cần rà soát và lưu lại workflow; trạng thái mới chưa có quy tắc sẽ bị chặn khi kiểm soát bật.
- Bản này chưa có nhiều workflow theo loại công việc, trình vẽ đồ thị, hay phê duyệt riêng cho mọi bước chuyển. Nghiệm thu hiện áp dụng cho bước hoàn thành.
- Tác vụ nền không có người thao tác sẽ bị chặn khi chuyển bước trong dự án đã bật workflow. Chuyển công việc vào dự án có workflow bật chưa được hỗ trợ.

## 13. Xử lý các tình huống nghiệp vụ

### 13.1. Công việc quá hạn

1. Mở danh sách quá hạn, loại trừ việc hoàn thành/đã hủy.
2. Người phụ trách ghi tiến độ thực tế và nguyên nhân.
3. Người quản lý xác định cần hỗ trợ, giảm phạm vi, đổi người hay điều chỉnh kế hoạch.
4. Nếu đổi hạn, cập nhật ngày và ghi lý do trong bình luận.
5. Rà soát ảnh hưởng đến các công việc phụ thuộc và mốc bàn giao.

Không chỉ đổi hạn để làm mất dấu quá hạn. Giữ lại nội dung giải thích cho lần thay đổi kế hoạch.

### 13.2. Công việc bị chặn

Ghi rõ đang chờ điều gì, ai hỗ trợ và thời điểm cần phản hồi. Thêm quan hệ phụ thuộc, nhãn hoặc trạng thái bị chặn theo cấu hình dự án. Khi được giải quyết, cập nhật lại trạng thái và kế hoạch thực hiện.

### 13.3. Thay đổi yêu cầu hoặc phạm vi

- Phần bổ sung nhỏ, cùng kết quả: cập nhật mô tả và ghi nhận thay đổi trong bình luận.
- Kết quả mới, có thể thực hiện độc lập: tạo công việc mới và liên kết với việc gốc.
- Phạm vi lớn ảnh hưởng dự án: người quản lý cập nhật tài liệu, kế hoạch nhóm/chu kỳ và phân công lại trước khi triển khai.

Hệ thống không tự phê duyệt thay đổi phạm vi chỉ vì người dùng sửa mô tả.

### 13.4. Sự cố khẩn cấp

1. Tạo công việc có tiêu đề nêu rõ sự cố và phạm vi ảnh hưởng.
2. Ghi thời điểm phát hiện, biểu hiện, thông tin kiểm chứng và kết quả cần đạt.
3. Gán người xử lý, ưu tiên phù hợp và thời hạn.
4. Thông báo qua kênh liên lạc của đội nếu cần phản ứng tức thời; không chỉ chờ người khác tự mở danh sách.
5. Cập nhật diễn biến và biện pháp xử lý trong công việc.
6. Sau xử lý, ghi kết quả kiểm tra và tạo việc phòng ngừa riêng nếu cần.

### 13.5. Bàn giao khi đổi người phụ trách

1. Người đang làm ghi rõ phần đã hoàn thành, phần còn lại và trở ngại.
2. Đính kèm tài liệu, tệp và liên kết cần tiếp tục xử lý.
3. Người quản lý thay đổi người phụ trách và xác nhận thời hạn.
4. Người nhận mở công việc, kiểm tra thông tin và xác nhận tiếp nhận bằng bình luận.

Việc đổi nhân sự trong XBus hoặc vô hiệu hóa tài khoản không tự bảo đảm mọi công việc cũ được giao sang người mới. Người quản lý cần rà soát và phân công lại; lịch sử người cũ vẫn cần được giữ.

### 13.6. Việc trùng, không cần làm hoặc lặp định kỳ

- **Trùng:** xác định một việc chính, dùng quan hệ trùng nếu có hoặc ghi liên kết trong bình luận; thống nhất cách xử lý việc dư.
- **Không tiếp tục:** chuyển **Đã hủy**, ghi lý do và quyết định liên quan.
- **Định kỳ:** lập kế hoạch một công việc riêng cho từng đợt khi cần lưu kết quả từng lần. Không mặc định hệ thống tự sinh việc định kỳ nếu chưa có tính năng/quy trình được triển khai.

## 14. Theo dõi tiến độ và phân tích

### 14.1. Đọc phân tích

1. Mở **Phân tích** của dự án hoặc mục phân tích trong không gian làm việc.
2. Xác nhận đúng dự án/phạm vi dữ liệu.
3. Kiểm tra bộ lọc và khoảng thời gian được cung cấp.
4. Đọc số liệu, biểu đồ và danh sách chi tiết nếu có.
5. Mở công việc liên quan để xác minh trước khi kết luận.

Các nhóm thông tin có thể gồm tổng số công việc, việc đã xử lý, ưu tiên, phân bổ theo thuộc tính và xu hướng tạo/giải quyết. Đọc đúng nhãn chỉ số đang hiển thị; không coi mọi biểu đồ là tỷ lệ hoàn thành của toàn dự án.

### 14.2. Cách diễn giải trong nghiệp vụ

- Nhiều việc chưa giao: cần hoàn thiện phân công.
- Nhiều việc đang thực hiện nhưng ít việc hoàn thành: kiểm tra việc bị chặn, phạm vi quá lớn hoặc chờ kiểm tra.
- Nhiều việc quá hạn: rà soát kế hoạch và năng lực thực hiện.
- Một người có nhiều việc: kiểm tra khối lượng thực tế, ưu tiên và thời hạn; số lượng việc không tự phản ánh khối lượng bằng nhau.
- Tỷ lệ hoàn thành cao: vẫn kiểm tra chất lượng và kết quả bàn giao, không chỉ số trạng thái.

Các thống kê phụ thuộc dữ liệu ngày, trạng thái và phân công được cập nhật đúng. Đội ngũ cần thống nhất ý nghĩa “Hoàn thành” trước khi dùng số liệu đánh giá tiến độ.

## 15. Tiếp nhận yêu cầu, tài liệu và công việc cá nhân

### 15.1. Tiếp nhận yêu cầu

Nếu dự án bật **Tiếp nhận**, dùng mục này để rà soát yêu cầu trước khi đưa vào kế hoạch chính.

1. Mở yêu cầu và đọc nội dung, người gửi, thông tin liên quan.
2. Xác minh có đúng phạm vi dự án và đã đủ thông tin hay chưa.
3. Dùng hành động tiếp nhận/chấp nhận, từ chối, đánh dấu trùng hoặc hoãn theo các lựa chọn giao diện cung cấp.
4. Khi tiếp nhận, kiểm tra công việc trong luồng dự án và bổ sung trạng thái, người phụ trách, ưu tiên, thời hạn.
5. Nếu từ chối hoặc hoãn, ghi lý do và điều kiện cần làm rõ.

Tiếp nhận yêu cầu không đồng nghĩa với nghiệm thu kết quả đã thực hiện.

### 15.2. Trang và tài liệu dự án

Nếu bật **Trang**, tạo tài liệu cho mục tiêu dự án, quy trình, quy ước trạng thái, tiêu chí nghiệm thu và biên bản tổng kết. Đặt tên dễ tìm và dẫn liên kết từ mô tả công việc khi cần.

Dùng tài liệu cho thông tin dùng chung; dùng công việc cho phần cần giao người, trạng thái và thời hạn. Không để một trang ghi chú trở thành danh sách giao việc duy nhất mà không có đầu việc được theo dõi.

### 15.3. Công việc của tôi

Mở **Công việc của tôi** bên trong module quản lý công việc để rà soát việc liên quan đến tài khoản. Kiểm tra bộ lọc/phạm vi hiện tại trước khi coi danh sách là toàn bộ việc phải làm.

Nếu hệ thống còn đường dẫn cũ `/work/my-tasks`, không mặc định dữ liệu ở trang cũ đồng bộ với module này. Dùng mục cá nhân trong module cho các công việc đã tạo tại `/work/projects`.

### 15.4. Bản nháp và ghi chú nhanh

- **Bản nháp:** mở nội dung đang soạn, kiểm tra dự án và hoàn thiện trước khi tạo chính thức. Người quản lý không nên coi bản nháp là công việc đã được giao đầy đủ.
- **Ghi chú nhanh:** dùng cho thông tin cá nhân cần nhớ. Khi nội dung cần giao người khác hoặc có hạn hoàn thành, tạo công việc chính thức.

## 16. Hoàn tất, lưu trữ và xóa dữ liệu

### 16.1. Phân biệt các hành động

| Hành động      | Khi dùng                                                  | Điều cần ghi nhận                     |
| -------------- | --------------------------------------------------------- | ------------------------------------- |
| **Hoàn thành** | Kết quả đạt tiêu chí                                      | Kết quả bàn giao và xác nhận kiểm tra |
| **Đã hủy**     | Không tiếp tục thực hiện                                  | Lý do, người quyết định và ảnh hưởng  |
| **Lưu trữ**    | Giữ lịch sử nhưng đưa ra khỏi luồng theo dõi thường xuyên | Phạm vi dữ liệu được lưu trữ          |
| **Xóa**        | Dữ liệu tạo nhầm/không cần giữ và có quyền xử lý          | Kiểm tra cảnh báo trước khi xác nhận  |

### 16.2. Lưu trữ công việc và khôi phục

1. Rà soát kết quả hoặc lý do kết thúc.
2. Mở menu **…** của công việc, chọn lưu trữ khi hành động được cho phép.
3. Đọc và xác nhận phạm vi thao tác.
4. Tìm lại trong mục lưu trữ phù hợp khi cần xem lịch sử.
5. Nếu cần đưa trở lại luồng làm việc, dùng hành động khôi phục được cung cấp và kiểm tra trạng thái, người phụ trách, ngày.

Không coi dữ liệu không xuất hiện trong danh sách thường xuyên là đã bị xóa. Kiểm tra bộ lọc và lưu trữ trước.

### 16.3. Hoàn tất dự án

1. Rà soát mục tiêu và kết quả bàn giao.
2. Kiểm tra việc chưa hoàn thành, bị chặn, quá hạn hoặc chưa có người phụ trách.
3. Hoàn thành việc đã đạt; hủy việc không thực hiện; lập kế hoạch riêng cho việc còn lại.
4. Tổng kết các nhóm công việc và chu kỳ.
5. Lưu tài liệu, liên kết kết quả và nội dung bàn giao trong dự án.
6. Người quản lý xác nhận đã xử lý các phần tồn đọng rồi dùng lưu trữ dự án nếu phù hợp.

Trạng thái công việc hoàn thành và hành động lưu trữ dự án không phải một thao tác tự động duy nhất.

### 16.4. Xóa công việc hoặc dự án

Chỉ người có quyền tương ứng thực hiện. Mở menu hoặc cài đặt, chọn xóa, kiểm tra đúng tên/mã trong hộp xác nhận và đọc cảnh báo mất dữ liệu.

Xóa có thể làm mất dữ liệu liên quan và không thể hoàn tác bằng thao tác thông thường trên giao diện. Không xóa dự án chỉ vì đã kết thúc; ưu tiên lưu trữ để giữ lịch sử.

## 17. Ví dụ xuyên suốt: một dự án đối soát vận hành

Ví dụ dưới đây là dữ liệu minh họa, không phải dự án được tạo sẵn.

### 17.1. Khởi tạo

- Tên: **Chuẩn hóa đối soát chuyến xe**.
- Mã: **DOISOAT**.
- Mục tiêu: có báo cáo đối chiếu đủ dữ liệu và giải trình chênh lệch.
- Thành viên: người quản lý, nhân sự vận hành, người tổng hợp dữ liệu, người kiểm tra báo cáo.
- Trạng thái: các trạng thái mặc định, thêm **Chờ kiểm tra** vào nhóm đang thực hiện.
- Nhãn: **Dữ liệu**, **Vận hành**, **Báo cáo**, **Cần xác minh**.

### 17.2. Tổ chức kế hoạch

Tạo ba nhóm: **Thu thập dữ liệu**, **Xác minh chênh lệch**, **Báo cáo và bàn giao**. Nếu thực hiện theo từng đợt, tạo chu kỳ **Đợt 1** và **Đợt 2** với ngày không gây xung đột theo kiểm tra của hệ thống.

| Đầu việc minh họa                    | Nhóm                | Chu kỳ | Kết quả cần có                       |
| ------------------------------------ | ------------------- | ------ | ------------------------------------ |
| Thu thập dữ liệu chuyến từ nguồn A   | Thu thập dữ liệu    | Đợt 1  | Tệp đủ dữ liệu trong phạm vi         |
| Thu thập dữ liệu từ nguồn B          | Thu thập dữ liệu    | Đợt 1  | Tệp có cấu trúc thống nhất           |
| Đối chiếu hai nguồn theo mã chuyến   | Xác minh chênh lệch | Đợt 1  | Danh sách các dòng chênh lệch        |
| Xác minh nguyên nhân từng chênh lệch | Xác minh chênh lệch | Đợt 2  | Giải trình hoặc người tiếp tục xử lý |
| Hoàn thiện và bàn giao báo cáo       | Báo cáo và bàn giao | Đợt 2  | Báo cáo được kiểm tra và xác nhận    |

Mỗi việc phải có người phụ trách và hạn riêng. Liên kết việc đối chiếu với các việc thu thập dữ liệu để thể hiện phụ thuộc.

### 17.3. Thực hiện và xử lý phát sinh

1. Nhân sự bắt đầu thu thập chuyển việc sang **Đang thực hiện**.
2. Nếu thiếu nguồn B, người phụ trách ghi rõ dữ liệu thiếu và người cần hỗ trợ; không đánh dấu việc đã hoàn thành.
3. Người quản lý rà soát hạn của việc đối chiếu và báo cáo, điều chỉnh có giải thích nếu cần.
4. Khi có tệp, người phụ trách đính kèm kết quả và gửi kiểm tra.
5. Người kiểm tra xác nhận đạt hoặc ghi điểm cần bổ sung.
6. Cập nhật trạng thái theo kết quả thực tế.

### 17.4. Tổng kết

Mở danh sách việc chưa hoàn thành, kiểm tra các giải trình còn thiếu và báo cáo bàn giao. Chuyển việc tồn đọng sang kế hoạch tiếp theo nếu cần, ghi tổng kết trong **Trang** của dự án, rồi lưu trữ khi không còn theo dõi thường xuyên.

## 18. Checklist theo vai trò

### 18.1. Người tạo/quản lý dự án — trước khi giao việc

- [ ] Tên, mã và mục tiêu dự án rõ ràng.
- [ ] Có phạm vi và tiêu chí hoàn tất.
- [ ] Thành viên mở được dự án với đúng quyền.
- [ ] Trạng thái, nhãn và thang ước lượng được thống nhất.
- [ ] Các tính năng cần dùng đã được bật.
- [ ] Công việc đủ mô tả, người phụ trách và thời hạn.
- [ ] Nhóm công việc và chu kỳ được chọn đúng.
- [ ] Phụ thuộc và người kiểm tra đã được ghi nhận.

### 18.2. Người thực hiện — hằng ngày

- [ ] Kiểm tra công việc được giao và việc đến hạn/quá hạn.
- [ ] Đọc yêu cầu, xác nhận phần chưa rõ.
- [ ] Cập nhật trạng thái khi thực sự bắt đầu hoặc chuyển bước.
- [ ] Ghi tiến độ, trở ngại và nhu cầu hỗ trợ.
- [ ] Bổ sung tệp/liên kết kết quả.
- [ ] Gửi kiểm tra theo tiêu chí đã thống nhất.
- [ ] Không tự đổi hạn hoặc phạm vi mà thiếu nội dung trao đổi.

### 18.3. Người kiểm tra — trước khi xác nhận hoàn thành

- [ ] Kiểm tra đúng phạm vi và phiên bản kết quả.
- [ ] Đối chiếu từng tiêu chí hoàn thành.
- [ ] Ghi phản hồi cụ thể nếu chưa đạt.
- [ ] Xác nhận kết quả nếu đạt.
- [ ] Kiểm tra công việc cha và các việc liên quan còn tồn đọng.

### 18.4. Người quản lý — cuối tuần/chu kỳ

- [ ] Rà soát việc chưa giao, quá hạn, bị chặn và chờ kiểm tra.
- [ ] Kiểm tra phân bổ theo người phụ trách.
- [ ] Lập kế hoạch lại việc chưa xong, không đóng việc chỉ để đạt số liệu.
- [ ] Tổng kết kết quả nhóm/chu kỳ.
- [ ] Bàn giao và lưu trữ dữ liệu đã kết thúc đúng phạm vi.

## 19. Xử lý lỗi và câu hỏi thường gặp

| Tình huống                                | Cách kiểm tra và xử lý                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Không mở được module                      | Chọn Kết nối lại, tải lại trang; kiểm tra tài khoản XBus đang hoạt động; báo quản trị nếu vẫn lỗi           |
| Không thấy dự án                          | Xóa tìm kiếm/bộ lọc; kiểm tra lưu trữ và quyền thành viên; nhờ người quản lý xác nhận quyền truy cập        |
| Không thấy nhân sự để giao việc           | Kiểm tra nhân sự đang hoạt động trong XBus; mở/kết nối lại module để đồng bộ; kiểm tra thành viên dự án     |
| Có nhân sự nhưng không sửa được công việc | Kiểm tra quyền dự án và trạng thái lưu trữ; không chỉ dựa vào việc người đó đã có trong không gian làm việc |
| Không thấy Chu kỳ/Nhóm công việc/Trang    | Kiểm tra tính năng dự án và quyền tài khoản                                                                 |
| Không tạo được chu kỳ                     | Đọc thông báo về tên, ngày bắt đầu/kết thúc và khoảng ngày chồng lấn                                        |
| Công việc không hiện ở Lịch/Gantt         | Kiểm tra bộ lọc, khoảng thời gian đang xem và dữ liệu ngày của công việc                                    |
| Kéo thẻ không được                        | Kiểm tra quyền, cách nhóm/sắp xếp và thông báo hệ thống; cập nhật thuộc tính từ chi tiết nếu cần            |
| Danh sách trống sau khi lọc               | Kiểm tra từng điều kiện và cách kết hợp; bỏ bộ lọc để đối chiếu danh sách ban đầu                           |
| Không thấy công việc sau khi lưu          | Kiểm tra thông báo tạo thành công, đúng dự án, trạng thái, bộ lọc và bản nháp                               |
| Số liệu phân tích khác danh sách          | Đối chiếu phạm vi, ngày, bộ lọc, nhóm trạng thái và dữ liệu lưu trữ                                         |
| Giao diện hoặc loading cũ                 | Tải lại mạnh: macOS `Command + Shift + R`, Windows `Ctrl + Shift + R`                                       |

Khi báo lỗi, gửi tên dự án, mã công việc, thời điểm, thao tác vừa thực hiện, thông báo lỗi và ảnh chụp phù hợp. Không gửi mật khẩu hoặc thông tin phiên đăng nhập.

**Nội dung cần thống nhất khi triển khai quy trình:** hệ thống lưu công việc và hỗ trợ theo dõi; đội ngũ chịu trách nhiệm cập nhật dữ liệu, xác nhận kết quả và phân công rõ ràng. Tạo trạng thái hay nhãn không tự tạo cơ chế phê duyệt, nhắc hạn hoặc điều phối bắt buộc.
