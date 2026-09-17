ALTER TABLE asset_transactions ADD COLUMN asset_type VARCHAR(191) NULL AFTER name;
ALTER TABLE asset_transactions ADD COLUMN description TEXT NULL AFTER asset_type;
