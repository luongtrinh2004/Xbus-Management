CREATE TABLE IF NOT EXISTS asset_product_categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL
);

ALTER TABLE asset_products ADD COLUMN category_id VARCHAR(64) NULL AFTER name;
CREATE INDEX ix_asset_products_category ON asset_products (category_id);

INSERT IGNORE INTO asset_product_categories (id, name, created_at)
SELECT CONCAT('asset_category_', LEFT(MD5(category_name), 16)),
       category_name,
       NOW(3)
FROM (
  SELECT TRIM(asset_type) AS category_name
  FROM asset_transactions
  WHERE asset_type IS NOT NULL AND TRIM(asset_type) <> ''
  GROUP BY TRIM(asset_type)
) legacy_categories;

UPDATE asset_products product
JOIN (
  SELECT asset_code, MAX(TRIM(asset_type)) AS category_name
  FROM asset_transactions
  WHERE asset_type IS NOT NULL AND TRIM(asset_type) <> ''
  GROUP BY asset_code
) legacy ON legacy.asset_code = product.code
JOIN asset_product_categories category ON category.name = legacy.category_name
SET product.category_id = category.id
WHERE product.category_id IS NULL OR product.category_id = '';
