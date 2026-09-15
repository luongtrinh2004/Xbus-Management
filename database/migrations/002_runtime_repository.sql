-- Bổ sung các trường/tables cần thiết khi ứng dụng chạy bằng MySQL.
-- An toàn để chạy nhiều lần trên MySQL 8.

ALTER TABLE water_schedules ADD COLUMN metadata JSON NULL;
ALTER TABLE fund_member_payments ADD COLUMN checkout_url VARCHAR(1024) NULL;

CREATE TABLE IF NOT EXISTS app_documents (
  document_key VARCHAR(100) PRIMARY KEY,
  document_value JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL
);
