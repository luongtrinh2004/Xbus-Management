# Quy Tắc Viết Nội Dung Giao Diện (UI Content Style Guide)

Áp dụng cho toàn bộ text hiển thị trên giao diện: tiêu đề trang, nhãn cột, chú thích, placeholder, tooltip, thông báo, và mô tả.

---

## 1. Nguyên Tắc Chung

- **Ngắn gọn, chính xác**: Mỗi dòng text phải truyền đúng thông tin cần thiết, không thừa.
- **Chuyên nghiệp**: Không dùng ngôn ngữ giải thích kỹ thuật nội bộ trong UI (ví dụ: `role`, `gender`, `userId`).
- **Người dùng làm trung tâm**: Viết theo góc nhìn người dùng, không theo góc nhìn developer.

---

## 2. Tiêu Đề & Nhãn (Titles & Labels)

| ❌ Không dùng | ✅ Dùng |
|---|---|
| Thống kê nhân sự role User (bao gồm cả nhân sự Nữ) | Thống kê lượt lấy nước |
| Danh sách user có gender = female | Danh sách nhân sự nữ |
| Bấm vào bất kỳ nhân sự nào để xem lịch sử đi lấy nước | *(bỏ, dùng tooltip hoặc hover effect)* |
| Random tất cả tuần | Phân công tự động |
| Set lịch | Thiết lập lịch |

**Quy tắc đặt tên:**
- Dùng danh từ cụm rõ nghĩa: `Lịch phân công`, `Thống kê lượt lấy nước`, `Lịch sử hoạt động`
- Tránh viết tắt kỹ thuật: không dùng `ID`, `UID`, `role`, `gender`, `status` trực tiếp trong UI text

---

## 3. Chú Thích & Mô Tả (Subtitles & Descriptions)

- **Không giải thích logic lọc trong UI**: Ví dụ `(bao gồm cả nhân sự Nữ)` hay `(role: user)` là thông tin nội bộ, không cần hiển thị cho người dùng.
- **Không dùng dấu ngoặc đơn để nhét thêm thông tin kỹ thuật** vào tiêu đề.
- Nếu cần hướng dẫn tương tác, dùng **tooltip** hoặc **empty state text** thay vì ghi thẳng vào tiêu đề/subtitle.

---

## 4. Hướng Dẫn Tương Tác (Action Hints)

| ❌ Không dùng | ✅ Dùng |
|---|---|
| Bấm vào bất kỳ nhân sự nào để xem... | *(dùng cursor: pointer + tooltip)* |
| Click để mở modal | *(hành vi rõ ràng qua UI design)* |
| Nhấn để random | Phân công ngẫu nhiên |

**Quy tắc:**
- Hành vi tương tác nên được truyền qua **visual cue** (hover, icon, cursor) chứ không qua text trong tiêu đề.
- Nếu bắt buộc dùng text hướng dẫn, đặt ở dưới component (dạng `helper text`) với font nhỏ hơn, màu muted.

---

## 5. Thông Báo & Toast (Notifications)

| ❌ Không dùng | ✅ Dùng |
|---|---|
| Lưu thành công! | Đã lưu lịch phân công |
| Error khi fetch data | Không thể tải dữ liệu. Vui lòng thử lại. |
| Xóa user thành công | Đã xóa nhân sự khỏi hệ thống |

**Quy tắc:**
- Toast thành công: `Đã [hành động] [đối tượng]` — rõ đối tượng bị tác động
- Toast lỗi: `Không thể [hành động]. [Lý do hoặc gợi ý]` — tránh để người dùng đoán

---

## 6. Trạng Thái Rỗng (Empty States)

| ❌ Không dùng | ✅ Dùng |
|---|---|
| Không có data | Chưa có dữ liệu |
| No users found | Không tìm thấy nhân sự phù hợp |
| Empty | Danh sách trống |

---

## 7. Nút Bấm (Buttons & CTAs)

| ❌ Không dùng | ✅ Dùng |
|---|---|
| Submit | Lưu / Xác nhận |
| Delete | Xóa nhân sự |
| Random | Phân công ngẫu nhiên |
| OK | Đồng ý |
| Cancel | Hủy bỏ |

**Quy tắc:**
- Nút hành động chính: động từ + danh từ rõ đối tượng: `Thêm nhân sự`, `Lưu lịch`, `Xác nhận xóa`
- Nút phụ: `Hủy bỏ`, `Quay lại`, `Đóng`

---

## 8. Phân Trang (Pagination)

Định dạng chuẩn: `Hiển thị {from} đến {to} trong {total} mục`

---

## 9. Từ Ngữ Nên Dùng & Tránh

| Thay vì | Dùng |
|---|---|
| User / Users | Nhân sự |
| Admin | Quản trị viên |
| Role | Vai trò |
| Status | Trạng thái |
| Gender | Giới tính |
| Dashboard | Trang tổng quan |
| Log / History | Lịch sử hoạt động |
| Random | Ngẫu nhiên / Phân công tự động |
| Schedule | Lịch phân công |
