ALTER TABLE asset_transactions
  ADD COLUMN unit VARCHAR(100) NULL AFTER quantity;

UPDATE asset_transactions transaction_row
JOIN asset_products product ON product.code = transaction_row.asset_code
LEFT JOIN asset_product_categories category ON category.id = product.category_id
SET transaction_row.unit = product.unit,
    transaction_row.asset_type = COALESCE(category.name, '');
