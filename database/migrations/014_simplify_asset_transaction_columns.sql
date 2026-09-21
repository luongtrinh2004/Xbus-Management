-- Các giá trị này đã được cố định tại thời điểm giao dịch; hậu tố `_snapshot`
-- không cần thiết trong tên cột và làm Database Editor khó đọc.
ALTER TABLE asset_transactions
  CHANGE COLUMN product_code_snapshot product_code VARCHAR(100) NULL,
  CHANGE COLUMN product_name_snapshot product_name VARCHAR(191) NULL,
  CHANGE COLUMN category_name_snapshot category_name VARCHAR(191) NULL,
  CHANGE COLUMN product_description_snapshot product_description TEXT NULL,
  CHANGE COLUMN unit_name_snapshot unit_name VARCHAR(100) NULL,
  CHANGE COLUMN location_snapshot location VARCHAR(191) NULL;
