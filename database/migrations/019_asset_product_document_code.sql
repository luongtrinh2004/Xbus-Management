ALTER TABLE asset_products ADD COLUMN document_code VARCHAR(64) NULL AFTER id;
CREATE INDEX idx_asset_products_document_code ON asset_products (document_code);

-- Reuse the existing document link where all matching transactions agree.
-- Products without a legacy transaction are initialized by getAssets using
-- the application's Vietnamese name normalization.
UPDATE asset_products p
JOIN (
  SELECT product_name, MIN(document_code) AS document_code
  FROM asset_transactions
  WHERE document_code IS NOT NULL AND document_code <> ''
  GROUP BY product_name
  HAVING COUNT(DISTINCT document_code) = 1
) t ON t.product_name = p.name
SET p.document_code = t.document_code
WHERE p.document_code IS NULL OR p.document_code = '';
