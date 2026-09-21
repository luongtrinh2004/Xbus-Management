-- Chuẩn hóa tên cột giao dịch tài sản theo đúng ý nghĩa dữ liệu hiện tại.
-- Các trường *_snapshot lưu lại nội dung tại thời điểm nhập/xuất để lịch sử
-- không bị thay đổi khi danh mục sản phẩm được chỉnh sửa về sau.
ALTER TABLE asset_transactions
  CHANGE COLUMN voucher_code document_code VARCHAR(64) NULL,
  CHANGE COLUMN type transaction_type ENUM('import','export') NOT NULL,
  CHANGE COLUMN asset_code product_code_snapshot VARCHAR(100) NULL,
  CHANGE COLUMN name product_name_snapshot VARCHAR(191) NULL,
  CHANGE COLUMN asset_type category_name_snapshot VARCHAR(191) NULL,
  CHANGE COLUMN description product_description_snapshot TEXT NULL,
  CHANGE COLUMN unit unit_name_snapshot VARCHAR(100) NULL,
  CHANGE COLUMN location location_snapshot VARCHAR(191) NULL,
  CHANGE COLUMN person document_person_name VARCHAR(191) NULL,
  CHANGE COLUMN issued_to recipient_name VARCHAR(191) NULL,
  CHANGE COLUMN performed_by performed_by_user_id VARCHAR(64) NULL;

ALTER TABLE asset_transactions
  RENAME INDEX ix_asset_transactions_voucher TO ix_asset_transactions_document;

ALTER TABLE asset_transactions
  RENAME INDEX ix_asset_stock TO ix_asset_transaction_product_date;
