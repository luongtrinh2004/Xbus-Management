-- Dữ liệu Excel cũ có nhiều giao dịch chưa có mã sản phẩm.
-- Tạo mã ổn định theo tên để các giao dịch cùng tên dùng chung một sản phẩm.
UPDATE asset_transactions
SET asset_code = CONCAT('LEGACY_', UPPER(SUBSTRING(MD5(LOWER(TRIM(name))), 1, 12)))
WHERE (asset_code IS NULL OR TRIM(asset_code) = '')
  AND name IS NOT NULL AND TRIM(name) <> '';

INSERT IGNORE INTO asset_products (id, code, name, unit, description, location, active, created_at)
SELECT CONCAT('product_', LOWER(SUBSTRING(MD5(asset_code), 1, 12))),
       asset_code,
       MAX(name),
       'Cái',
       MAX(description),
       MAX(location),
       TRUE,
       MIN(created_at)
FROM asset_transactions
WHERE asset_code IS NOT NULL AND TRIM(asset_code) <> ''
GROUP BY asset_code;
