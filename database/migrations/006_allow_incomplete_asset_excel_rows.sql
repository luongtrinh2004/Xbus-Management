-- Chỉ phục vụ dữ liệu import Excel lịch sử: cho phép lưu dòng thiếu trường.
ALTER TABLE asset_transactions MODIFY asset_code VARCHAR(100) NULL;
ALTER TABLE asset_transactions MODIFY name VARCHAR(191) NULL;
ALTER TABLE asset_transactions MODIFY transaction_date DATE NULL;
ALTER TABLE asset_transactions MODIFY quantity INT NULL;
