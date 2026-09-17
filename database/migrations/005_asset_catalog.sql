-- Danh mục sản phẩm là master data, giao dịch chỉ được phép dùng sản phẩm active.
CREATE TABLE IF NOT EXISTS asset_products (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  description TEXT NULL,
  location VARCHAR(191) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  INDEX ix_asset_products_active (active, name)
);

-- Bảo toàn dữ liệu giao dịch cũ bằng cách tạo danh mục từ từng mã đã có.
INSERT IGNORE INTO asset_products (id, code, name, unit, description, location, active, created_at)
SELECT CONCAT('product_', LOWER(REPLACE(asset_code, ' ', '_'))),
       asset_code,
       MAX(name),
       'Cái',
       MAX(description),
       MAX(location),
       TRUE,
       MIN(created_at)
FROM asset_transactions
GROUP BY asset_code;

ALTER TABLE asset_transactions ADD COLUMN voucher_code VARCHAR(64) NULL AFTER id;
ALTER TABLE asset_transactions ADD COLUMN performed_by VARCHAR(64) NULL AFTER person;
CREATE INDEX ix_asset_transactions_voucher ON asset_transactions (voucher_code);
