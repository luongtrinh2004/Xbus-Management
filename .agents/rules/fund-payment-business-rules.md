# Nghiệp Vụ Thanh Toán Quỹ Phòng

Áp dụng cho màn hình **Quản lý quỹ phòng**, đặc biệt là `/fund?section=members`.

## 1. Phân quyền

- **Admin** và **Trợ lý** được chỉnh sửa mức đóng quỹ tối thiểu theo hình thức nhân sự.
- Mọi nhân sự đang hoạt động được xem danh sách đóng quỹ và trạng thái thanh toán của tất cả thành viên.
- Nút **Đóng quỹ** chỉ hiển thị tại dòng của tài khoản đang đăng nhập, khi người đó chưa hoàn tất thanh toán trong kỳ đang xem.
- Admin và Trợ lý vẫn có thể xác nhận hoặc hủy xác nhận thủ công khi cần đối soát.

## 2. Mức đóng tối thiểu mặc định

| Hình thức nhân sự | Mức tối thiểu |
| --- | ---: |
| Chính thức (`category_official`) | 150.000 VNĐ |
| Thử việc (`category_probation`) | 150.000 VNĐ |
| Thực tập (`category_intern`) | 100.000 VNĐ |
| Cộng tác viên (`category_collaborator`) | 100.000 VNĐ |

- Mức đóng được cấu hình tại thẻ **Quản lý quỹ phòng**, cạnh bộ chọn **Kỳ theo dõi**.
- Cài đặt có đúng bốn mức đóng theo loại nhân sự, dùng chung tháng bắt đầu/kết thúc. Ngoài khoảng áp dụng trở về mức cố định 150.000 / 150.000 / 100.000 / 100.000 đ; không dùng giá trị thử nghiệm trong cấu hình cũ làm mặc định.
- Giá trị mới chỉ áp dụng cho kỳ mới. Mức phải đóng và loại nhân sự được chốt theo từng người trong kỳ đã phát sinh, không tính lại theo cấu hình hoặc hồ sơ hiện tại.

## 3. Luồng đóng quỹ PayOS

1. Nhân sự mở `/fund?section=members` và chọn **Đóng quỹ** ở dòng của chính mình.
2. Modal hiển thị mức đóng của kỳ; người dùng được nhập số tiền nguyên lớn hơn 0, kể cả thấp hơn mức phải đóng.
3. Sau khi chọn số tiền, hệ thống tạo Payment Link PayOS vào tài khoản ngân hàng đã liên kết của Trợ lý.
4. Modal hiển thị mã VietQR và số tiền chính xác cần chuyển.
5. Hệ thống chờ webhook PayOS đã xác minh chữ ký; giao diện cũng polling trạng thái ngắn hạn để cập nhật nhanh.
6. Khi thanh toán thành công, so sánh tiền thực đóng với mức chốt của kỳ để hiển thị **Đóng thiếu**, **Đã đóng**, hoặc **Đóng thừa**.
7. Chỉ webhook đã xác minh, đối soát server qua SDK, hoặc xác nhận thủ công của Admin/Trợ lý được ghi nhận tiền đã thu. Nhật ký ghi người đóng, vai trò và kỳ quỹ.

## 4. Dữ liệu và an toàn thanh toán

- Mỗi yêu cầu có `orderCode` PayOS duy nhất, liên kết với nhân sự và kỳ quỹ.
- Một thanh toán thành công chỉ được ghi nhận một lần (idempotent theo `orderCode`).
- Không đưa `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, hoặc `PAYOS_CHECKSUM_KEY` vào mã nguồn hay client-side.
- Webhook phải xác thực HMAC SHA-256 bằng Checksum Key trước khi cập nhật dữ liệu quỹ.
- Link thanh toán hết hạn phải không được phép tự chuyển trạng thái đã đóng.

## 5. Hiển thị trạng thái

- **Chưa đóng**: hiển thị cho tất cả người dùng; riêng chủ tài khoản thấy nút **Đóng quỹ**.
- **Đang chờ thanh toán**: hiển thị cho chủ tài khoản trong modal; không tính vào tổng quỹ.
- **Đã đóng**: hiển thị công khai cho tất cả người dùng, bao gồm số tiền và thời gian đóng; được tính vào tổng quỹ.
- **Đã hủy / hết hạn**: không tính vào tổng quỹ và có thể tạo yêu cầu thanh toán mới.

## 6. Hủy nghĩa vụ và thống kê

- Trạng thái **Hủy** là hủy nghĩa vụ, khác hủy link hoặc hủy duyệt thanh toán. Admin/Trợ lý phải nhập lý do (được miễn, nghỉ việc, khác), có thể khôi phục.
- Hủy nghĩa vụ không xóa tiền đã thu. Link cũ thanh toán thành công vẫn phải được ghi nhận tiền, trong khi nghĩa vụ vẫn giữ trạng thái hủy.
- Người có nghĩa vụ bị hủy không tạo link thanh toán mới và không nhận nhắc đóng.
- Thống kê từng kỳ xếp cột theo số tiền thực đóng giảm dần, giữ cả người chưa đóng (0 đồng), có cuộn ngang và chọn tháng.

## 7. Chênh lệch và chuyển kỳ

- Bảng hiển thị số tiền cần đóng, thực tế, chênh lệch có dấu; không có cột bộ phận. Hủy nghĩa vụ hiển thị nền tím.
- Mức cơ bản được chốt riêng. Số cần đóng = max(0, mức cơ bản - số dư chuyển vào). Tiền thiếu được chuyển dưới dạng số dư âm.
- Chỉ khoản đã xác nhận thanh toán được tính thực tế. Không tính tiền đang chờ hoặc cộng số dư chuyển kỳ vào thu thực tế.
- Tiền dư chưa dùng hết tiếp tục chuyển qua nhiều kỳ. Đối soát lại kỳ trước phải tính lại số dư các kỳ sau, không cộng trùng.
- Nhân sự đóng dư tự nguyện: không chuyển phần dư dương sang kỳ sau, nhưng phần thiếu vẫn chuyển tiếp. Cài đặt áp dụng cho kỳ hiện tại và kỳ mới, lưu riêng trên từng bản ghi.
- Nếu số cần đóng bằng 0 do bù dư, hiển thị đã đóng mà không tạo thêm tiền thu. Hủy nghĩa vụ không xóa nợ hoặc tiền đã thu từ kỳ trước.
