ALTER TABLE asset_transactions
  ADD COLUMN issued_to VARCHAR(191) NULL AFTER person;
