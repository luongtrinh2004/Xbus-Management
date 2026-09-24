-- Manual assignments allow up to two people; automatic assignment remains one.
ALTER TABLE trash_schedules ADD COLUMN second_user_id VARCHAR(64) NULL;
ALTER TABLE trash_schedules ADD COLUMN second_completed_by VARCHAR(64) NULL;
