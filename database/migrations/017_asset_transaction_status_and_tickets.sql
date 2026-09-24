-- Bổ sung ticket_id và trạng thái duyệt cho asset_transactions
-- Hỗ trợ quy trình: user tạo phiếu -> admin/trợ lý duyệt -> khi duyệt mới tính vào số lượng tồn kho

ALTER TABLE asset_transactions
  ADD COLUMN ticket_id VARCHAR(64) NULL,
  ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'approved',
  ADD COLUMN approved_by VARCHAR(64) NULL,
  ADD COLUMN approved_at DATETIME(3) NULL,
  ADD COLUMN rejected_by VARCHAR(64) NULL,
  ADD COLUMN rejected_at DATETIME(3) NULL,
  ADD COLUMN reject_reason TEXT NULL;

UPDATE asset_transactions SET status = 'approved' WHERE status IS NULL OR status = '';

-- Gán mã phiếu tự sinh tăng dần (VD: AAA000, AAA001, ...)
UPDATE asset_transactions t
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) - 1 AS rn
  FROM asset_transactions
) n ON t.id = n.id
SET t.ticket_id = CONCAT(
  CHAR(65 + (FLOOR(n.rn / 676000) % 26)),
  CHAR(65 + (FLOOR(n.rn / 26000) % 26)),
  CHAR(65 + (FLOOR(n.rn / 1000) % 26)),
  LPAD(n.rn % 1000, 3, '0')
)
WHERE t.ticket_id IS NULL OR t.ticket_id = '' OR t.ticket_id LIKE 'import_excel_%' OR t.ticket_id LIKE 'export_excel_%' OR t.ticket_id NOT REGEXP '^[A-Z]{3}[0-9]{3}$';


