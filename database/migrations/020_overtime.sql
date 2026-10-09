CREATE TABLE IF NOT EXISTS overtime_settings (
  id TINYINT PRIMARY KEY,
  config JSON NOT NULL
);
INSERT IGNORE INTO overtime_settings (id, config) VALUES (1, '{"allowPast":false,"maxDailyMinutes":0,"maxMonthlyMinutes":0,"breakMinutes":0,"weekendDays":[0,6],"holidays":[]}');
CREATE TABLE IF NOT EXISTS overtime_requests (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  start_time DATETIME(3) NOT NULL,
  end_time DATETIME(3) NOT NULL,
  ot_type VARCHAR(32) NOT NULL,
  registered_minutes INT NOT NULL,
  actual_minutes INT NULL,
  confirmed_minutes INT NULL,
  reason TEXT NOT NULL,
  work_report TEXT,
  status VARCHAR(32) NOT NULL,
  approved_by VARCHAR(64) NULL,
  approved_at DATETIME(3) NULL,
  confirmed_by VARCHAR(64) NULL,
  confirmed_at DATETIME(3) NULL,
  rejection_reason TEXT,
  created_by VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  record_json JSON NOT NULL,
  INDEX ix_ot_user_time (user_id, start_time, end_time),
  INDEX ix_ot_status (status, start_time),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS overtime_history (
  id VARCHAR(64) PRIMARY KEY,
  overtime_id VARCHAR(64) NULL,
  action VARCHAR(32) NOT NULL,
  old_status VARCHAR(32) NULL,
  new_status VARCHAR(32) NULL,
  changed_by VARCHAR(64) NOT NULL,
  note TEXT,
  changed_at DATETIME(3) NOT NULL,
  record_json JSON NOT NULL,
  INDEX ix_ot_history (overtime_id, changed_at),
  FOREIGN KEY (overtime_id) REFERENCES overtime_requests(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);
