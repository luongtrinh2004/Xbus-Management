UPDATE asset_products product
JOIN asset_product_categories category
  ON LOWER(TRIM(category.name)) = LOWER(TRIM(product.unit))
SET product.category_id = category.id,
    product.unit = 'Cái',
    product.updated_at = NOW(3)
WHERE product.category_id IS NULL OR TRIM(product.category_id) = '';

DELETE unit_row
FROM asset_product_units unit_row
JOIN asset_product_categories category
  ON LOWER(TRIM(category.name)) = LOWER(TRIM(unit_row.name))
LEFT JOIN asset_products product
  ON LOWER(TRIM(product.unit)) = LOWER(TRIM(unit_row.name))
WHERE product.id IS NULL;

UPDATE asset_transactions transaction_row
JOIN asset_products product ON product.code = transaction_row.asset_code
LEFT JOIN asset_product_categories category ON category.id = product.category_id
SET transaction_row.asset_type = COALESCE(category.name, ''),
    transaction_row.unit = product.unit;
