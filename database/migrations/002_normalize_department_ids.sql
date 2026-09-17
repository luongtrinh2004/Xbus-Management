-- Chuẩn hoá mã bộ phận về dạng ngắn, ổn định và dễ đọc.
-- Chạy trong transaction để giữ nguyên liên kết users.department_id.
START TRANSACTION;

INSERT INTO departments (id, name, description, active, created_at)
SELECT 'web_app', '__migrating_web_app__', description, active, created_at
FROM departments WHERE id = 'type_web_app';

INSERT INTO departments (id, name, description, active, created_at)
SELECT 'ap', '__migrating_ap__', description, active, created_at
FROM departments WHERE id = 'type_ap';

INSERT INTO departments (id, name, description, active, created_at)
SELECT 'peer_admin', '__migrating_peer_admin__', description, active, created_at
FROM departments WHERE id = 'type_peer_admin';

INSERT INTO departments (id, name, description, active, created_at)
SELECT 'van_hanh', '__migrating_van_hanh__', description, active, created_at
FROM departments WHERE id = 'type_vn_hnh_1789642809979';

UPDATE users SET department_id = CASE department_id
  WHEN 'type_web_app' THEN 'web_app'
  WHEN 'type_ap' THEN 'ap'
  WHEN 'type_peer_admin' THEN 'peer_admin'
  WHEN 'type_vn_hnh_1789642809979' THEN 'van_hanh'
  ELSE department_id
END;

DELETE FROM departments
WHERE id IN ('type_web_app', 'type_ap', 'type_peer_admin', 'type_vn_hnh_1789642809979');

UPDATE departments SET name = CASE id
  WHEN 'web_app' THEN 'Web/App'
  WHEN 'ap' THEN 'AP'
  WHEN 'peer_admin' THEN 'Peer Admin'
  WHEN 'van_hanh' THEN 'Vận Hành'
  ELSE name
END
WHERE id IN ('web_app', 'ap', 'peer_admin', 'van_hanh');

COMMIT;
