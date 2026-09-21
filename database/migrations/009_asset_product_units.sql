CREATE TABLE IF NOT EXISTS asset_product_units (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL
);

INSERT IGNORE INTO asset_product_units (id, name, created_at)
VALUES ('asset_unit_cai', 'Cái', NOW(3)),
       ('asset_unit_chiec', 'Chiếc', NOW(3));

INSERT IGNORE INTO asset_product_units (id, name, created_at)
SELECT CONCAT('asset_unit_', LEFT(MD5(LOWER(TRIM(unit))), 20)),
       TRIM(unit),
       NOW(3)
FROM asset_products
WHERE unit IS NOT NULL AND TRIM(unit) <> ''
GROUP BY TRIM(unit);
