ALTER TABLE asset_products
  MODIFY code VARCHAR(100) NULL;

UPDATE asset_products
SET code = NULL
WHERE TRIM(code) = '';
