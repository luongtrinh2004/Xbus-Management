# Upload nền thư viện

- Bấm Tải lên: lưu nội dung bài và danh sách phiên upload trước khi gửi file.
- Trình duyệt gửi từng phần tối đa 100.000.000 byte, tối đa hai request song song (mỗi request vẫn tối đa 100 MB); chunk lỗi được thử lại tối đa 3 lần.
- API stream request vào MinIO, không gom toàn bộ request multipart vào RAM.
- API complete chỉ kiểm tra chunk và đưa job vào BullMQ. Redis lưu trạng thái; worker ghép file, giải nén ZIP trên ổ đĩa tạm, đưa từng ảnh/video vào thư mục bài và tạo thumbnail ảnh.
- Tên object cố định theo session và thứ tự file để job chạy lại không sinh bản trùng.
- Bài đăng hiển thị ngay; thư viện cập nhật file hoàn tất và tiến độ server mỗi 5 giây. Tiến độ truyền, dung lượng đã tải/tổng dung lượng và tốc độ trung bình trong tab hiện tại cập nhật từ XHR.
- Giữ tab mở trong lúc truyền file. Có cảnh báo khi rời trang. Đóng modal hoặc chuyển trang trong ứng dụng không hủy upload; reload/đóng tab sẽ ngắt phần chưa truyền. Sau F5, bấm “Chọn lại file gốc để tiếp tục sau F5”: hệ thống bỏ qua chunk đã lưu trên server và truyền lại phần còn thiếu. Dung lượng đang truyền dở chưa được xác nhận sẽ không được giữ.
- Sau khi truyền xong, worker tiếp tục độc lập với trình duyệt. Redis phải bật persistence và worker phải chạy cùng phiên bản image với web.

## Deploy

`deploy.sh` khởi động `redis`, `minio`, `xbus-office`, `gallery-worker`.
Kiểm tra bằng `docker compose logs --tail 100 gallery-worker` và `docker compose ps`.
Worker cần dung lượng ổ đĩa tạm cho file gốc + một file đang giải nén. ZIP không giữ toàn bộ file đã giải nén trong RAM. RAR dùng thư viện giải nén trong bộ nhớ, hiện giới hạn 512 MB cho cả nguồn và tổng giải nén; ZIP hỗ trợ nguồn lớn hơn.

Nếu Nginx đứng trước Next.js, cấu hình location upload cho phép chunk 100 MB và không buffer toàn bộ request, ví dụ trong cấu hình proxy hiện có:

```nginx
location = /api/gallery/upload/chunk {
    client_max_body_size 100m;
    proxy_request_buffering off;
    proxy_http_version 1.1;
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Các proxy/CDN phía trước cũng phải cho phép kích thước request này. Thay đổi chunk không làm tăng băng thông đường truyền. Kiểm tra `nginx -t` trước khi reload cấu hình trên server.

Trang theo dõi BullMQ: `/bull-board`, chỉ tài khoản admin. Job xuất hiện sau khi toàn bộ chunk của file đã tới server; upload đang truyền chưa phải job BullMQ.
