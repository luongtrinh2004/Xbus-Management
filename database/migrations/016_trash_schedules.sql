-- One persisted assignment per business date. Keep historical user IDs even if a user was removed.
CREATE TABLE IF NOT EXISTS trash_schedules (
  schedule_date DATE PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by VARCHAR(64) NULL,
  completed_at DATETIME(3) NULL,
  INDEX ix_trash_user_date (user_id, schedule_date)
);

START TRANSACTION;

-- INSERT IGNORE makes retry safe without replacing newer assignments.
INSERT IGNORE INTO trash_schedules (schedule_date, user_id, completed, completed_by, completed_at)
SELECT CAST(d.date_key AS DATE),
  NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.setting_value, CONCAT('$.trashScheduleOverrides."', d.date_key, '"'))), 'null'), ''),
  JSON_CONTAINS_PATH(s.setting_value, 'one', CONCAT('$.trashScheduleCompletions."', d.date_key, '"')),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.setting_value, CONCAT('$.trashScheduleCompletions."', d.date_key, '".userId'))), 'null'),
  CONVERT_TZ(STR_TO_DATE(LEFT(JSON_UNQUOTE(JSON_EXTRACT(s.setting_value, CONCAT('$.trashScheduleCompletions."', d.date_key, '".completedAt'))), 23), '%Y-%m-%dT%H:%i:%s.%f'), '+00:00', '+07:00')
FROM app_settings s
JOIN JSON_TABLE(JSON_MERGE_PRESERVE(
  COALESCE(JSON_KEYS(JSON_EXTRACT(s.setting_value, '$.trashScheduleOverrides')), JSON_ARRAY()),
  COALESCE(JSON_KEYS(JSON_EXTRACT(s.setting_value, '$.trashScheduleCompletions')), JSON_ARRAY())
), '$[*]' COLUMNS (date_key VARCHAR(10) PATH '$')) d
WHERE s.setting_key = 'global';

INSERT IGNORE INTO app_documents (document_key, document_value, updated_at)
SELECT 'trash-schedule-meta', JSON_OBJECT(
  'revision', COALESCE(JSON_EXTRACT(setting_value, '$.trashScheduleRevision'), 0),
  'generationMeta', COALESCE(JSON_EXTRACT(setting_value, '$.trashScheduleGenerationMeta'), JSON_OBJECT())
), NOW(3) FROM app_settings WHERE setting_key = 'global';

UPDATE app_settings SET setting_value = JSON_REMOVE(setting_value,
  '$.trashScheduleOverrides', '$.trashScheduleCompletions', '$.trashScheduleRevision', '$.trashScheduleGenerationMeta'
) WHERE setting_key = 'global';

COMMIT;
