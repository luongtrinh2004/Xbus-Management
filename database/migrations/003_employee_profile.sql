ALTER TABLE users ADD COLUMN citizen_id VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN citizen_issued_date DATE NULL;
ALTER TABLE users ADD COLUMN address VARCHAR(500) NULL;
ALTER TABLE users ADD COLUMN position VARCHAR(120) NULL;
ALTER TABLE users ADD COLUMN jira_account VARCHAR(191) NULL;
ALTER TABLE users ADD COLUMN joined_date DATE NULL;

CREATE UNIQUE INDEX uq_users_citizen_id ON users (citizen_id);
