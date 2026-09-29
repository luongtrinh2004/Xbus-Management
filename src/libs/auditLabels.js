export const actionLabels = {
  DATABASE_CLEAR_TABLE: "Xóa toàn bộ dữ liệu bảng",
  DELETE_FUND_SETTING: "Xóa cấu hình mức đóng quỹ",
  UPLOAD_GALLERY_FILE: "Tải ảnh/video lên",
  CREATE_GALLERY_POST: "Đăng bài ảnh/video",
  UPDATE_GALLERY_POST: "Chỉnh sửa bài ảnh/video",
  DELETE_GALLERY_POST: "Xóa bài ảnh/video",
  LIKE_GALLERY_POST: "Thích bài ảnh/video",
  UNLIKE_GALLERY_POST: "Bỏ thích bài ảnh/video",
  CREATE_GALLERY_COMMENT: "Bình luận ảnh/video",
  UPDATE_GALLERY_COMMENT: "Chỉnh sửa bình luận ảnh/video",
  DELETE_GALLERY_COMMENT: "Xóa bình luận ảnh/video",
  TAG_GALLERY_POST: "Gắn thẻ bài ảnh/video",
  VIEW_GALLERY_MEDIA: "Xem ảnh/video",
  PLAY_GALLERY_VIDEO: "Phát video",
  PAUSE_GALLERY_VIDEO: "Tạm dừng video",
  SEEK_GALLERY_VIDEO: "Tua video",
  DOWNLOAD_GALLERY_MEDIA: "Yêu cầu tải ảnh/video xuống",
  SHARE_GALLERY_POST: "Sao chép liên kết ảnh/video",
  UPDATE_USER_AVATAR: "Cập nhật ảnh đại diện",
  DELETE_USER_AVATAR: "Xóa ảnh đại diện",

  // Điểm rèn luyện
  RESET_SCHEDULING_POINTS: "Đặt lại điểm rèn luyện",
  UPDATE_EXTRACURRICULAR_POINTS: "Cập nhật điểm rèn luyện",

  // Nhân sự
  CREATE_USER: "Thêm nhân sự",
  UPDATE_USER: "Cập nhật nhân sự",
  DELETE_USER: "Xóa nhân sự",
  ACTIVATE_USER: "Kích hoạt nhân sự",
  UPDATE_PROFILE: "Cập nhật hồ sơ",
  IMPORT_USERS: "Nhập nhân sự từ file",

  // Lịch bê nước
  UPDATE_SCHEDULE: "Cập nhật lịch bê nước",
  COMPLETE_SCHEDULE: "Hoàn thành lịch bê nước",
  CANCEL_SCHEDULE: "Hủy lịch bê nước",
  DELETE_SCHEDULE: "Xóa lịch bê nước",

  // Lịch đổ rác
  FILL_EMPTY_TRASH_SCHEDULE: "Phân công ngẫu nhiên lịch đổ rác",
  SHIFT_TRASH_SCHEDULE: "Đôn lịch đổ rác",
  UPDATE_TRASH_SCHEDULE: "Cập nhật lịch đổ rác",
  COMPLETE_TRASH_SCHEDULE: "Hoàn thành lịch đổ rác",

  // Quản lý tài sản
  REQUEST_IMPORT_ASSET: "Yêu cầu nhập tài sản",
  REQUEST_EXPORT_ASSET: "Yêu cầu xuất tài sản",
  APPROVE_ASSET_TRANSACTION: "Duyệt giao dịch tài sản",
  REJECT_ASSET_TRANSACTION: "Từ chối giao dịch tài sản",
  IMPORT_ASSET: "Nhập tài sản",
  EXPORT_ASSET: "Xuất tài sản",
  UPDATE_ASSET: "Cập nhật tài sản",
  DELETE_ASSET: "Xóa tài sản",
  UPDATE_ASSET_TRANSACTION: "Cập nhật giao dịch tài sản",
  DELETE_ASSET_TRANSACTION: "Xóa giao dịch tài sản",
  ROLLBACK_ASSET_TRANSACTION: "Hoàn tác giao dịch tài sản",
  UPSERT_ASSETS_FROM_EXCEL: "Nhập dữ liệu tài sản từ Excel",
  ADJUST_ASSET_STOCK_FROM_EXCEL: "Điều chỉnh tồn kho từ Excel",
  UPSERT_ASSET_PRODUCTS_FROM_EXCEL: "Nhập danh mục sản phẩm từ Excel",
  CREATE_ASSET_PRODUCT: "Thêm sản phẩm",
  UPDATE_ASSET_PRODUCT: "Cập nhật sản phẩm",
  DELETE_ASSET_PRODUCT: "Xóa sản phẩm",

  // Bộ phận
  CREATE_TYPE: "Thêm bộ phận",

  // Quỹ phòng
  CREATE_FUND_INCOME: "Thêm khoản thu",
  CREATE_FUND_EXPENSE: "Thêm khoản chi",
  UPDATE_FUND_TRANSACTION: "Cập nhật giao dịch quỹ",
  DELETE_FUND_TRANSACTION: "Xóa giao dịch quỹ",
  APPROVE_FUND_PAYMENT: "Duyệt đóng quỹ tháng",
  CANCEL_FUND_PAYMENT: "Hủy duyệt đóng quỹ tháng",
  PAYOS_FUND_PAYMENT: "Đóng quỹ trực tuyến",
  SEND_FUND_REMINDER: "Gửi nhắc nhở đóng quỹ",
  CANCEL_FUND_OBLIGATION: "Hủy nghĩa vụ đóng quỹ",
  RESTORE_FUND_OBLIGATION: "Khôi phục nghĩa vụ đóng quỹ",
  UPDATE_FUND_SETTINGS: "Cài đặt mức đóng quỹ",
  UPDATE_FUND_CONFIG: "Cập nhật cấu hình quỹ",

  // Trà chiều
  CREATE_TEA_INVITATION: "Tạo lời mời trà chiều",
  UPDATE_TEA_INVITATION: "Cập nhật lời mời trà chiều",
  DELETE_TEA_INVITATION: "Xóa lời mời trà chiều",

  // Chỉnh sửa CSDL trực tiếp
  DATABASE_UPDATE: "Chỉnh sửa CSDL trực tiếp",
  DATABASE_INSERT: "Thêm bản ghi CSDL",
  DATABASE_DELETE: "Xóa bản ghi CSDL",
  DATABASE_CLEAR_ALL: "Xóa toàn bộ dữ liệu bảng",
  DATABASE_CLEAR_IMPORTS: "Xóa dữ liệu nhập kho",
  DATABASE_CLEAR_EXPORTS: "Xóa dữ liệu xuất kho",
};

export const targetLabels = {
  GALLERY: "Thư viện ảnh/video",
  asset_products: "Danh mục sản phẩm",
  asset_product_categories: "Loại sản phẩm",
  asset_product_units: "Đơn vị tính",
  USER: "Nhân sự",
  users: "Nhân sự",
  water_schedules: "Lịch bê nước",
  trash_schedule: "Lịch đổ rác",
  trash_schedules: "Lịch đổ rác",
  TYPE: "Bộ phận",
  departments: "Bộ phận / Phòng ban",
  employment_categories: "Loại hình nhân sự",
  ASSET: "Tài sản",
  ASSET_PRODUCT: "Danh mục sản phẩm",
  asset_transactions: "Giao dịch tài sản",
  FUND: "Quỹ phòng",
  fund_periods: "Kỳ quỹ",
  fund_member_payments: "Đóng quỹ thành viên",
  fund_transactions: "Giao dịch quỹ",
  AFTERNOON_TEA: "Trà chiều",
  audit_logs: "Nhật ký hệ thống",
  app_settings: "Cài đặt hệ thống",
  app_documents: "Dữ liệu ứng dụng",
};

export const actionLabel = action => actionLabels[action] || "Thao tác hệ thống khác";
