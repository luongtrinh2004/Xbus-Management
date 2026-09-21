-- Quy ước: tên cột chỉ rõ đối tượng; khóa liên kết kết thúc bằng `_id`.
ALTER TABLE asset_products
  CHANGE COLUMN category_id product_category_id VARCHAR(64) NULL,
  CHANGE COLUMN unit unit_name VARCHAR(100) NOT NULL,
  CHANGE COLUMN location storage_location VARCHAR(191) NULL;

ALTER TABLE asset_transactions
  CHANGE COLUMN category_name product_category_name VARCHAR(191) NULL,
  CHANGE COLUMN location storage_location VARCHAR(191) NULL,
  CHANGE COLUMN document_person_name counterparty_name VARCHAR(191) NULL;
