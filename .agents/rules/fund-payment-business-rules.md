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
- Giá trị mới chỉ áp dụng cho các yêu cầu thanh toán được tạo sau khi thay đổi; không được làm thay đổi số tiền của giao dịch đã thành công.

## 3. Luồng đóng quỹ PayOS

1. Nhân sự mở `/fund?section=members` và chọn **Đóng quỹ** ở dòng của chính mình.
2. Modal hiển thị số tiền đóng; người dùng chỉ được nhập số tiền lớn hơn hoặc bằng mức tối thiểu theo hình thức của mình.
3. Sau khi chọn số tiền, hệ thống tạo Payment Link PayOS vào tài khoản ngân hàng đã liên kết của Trợ lý.
4. Modal hiển thị mã VietQR và số tiền chính xác cần chuyển.
5. Hệ thống chờ webhook PayOS đã xác minh chữ ký; giao diện cũng polling trạng thái ngắn hạn để cập nhật nhanh.
6. Khi PayOS báo thanh toán thành công, khoản đóng được ghi nhận là **Đã đóng**, đồng thời cập nhật công khai trong bảng danh sách.
7. Chỉ webhook đã xác minh hoặc thao tác xác nhận thủ công của Admin/Trợ lý mới được chuyển trạng thái sang **Đã đóng**.

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
