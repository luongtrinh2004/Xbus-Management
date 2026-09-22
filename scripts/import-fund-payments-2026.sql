-- Source: screenshot Quy_2026, February through September.
-- Quyen = Nguyen Thi Hong Quyen (quyennth). Amounts are VND.
-- The sheet is authoritative: blank cells are marked unpaid.
-- Monthly payments already appear as income in the application.
-- Do not duplicate these amounts in fund_transactions.
-- No payment dates were provided, so imported payment dates are NULL.
-- Run in one connection. The transaction commits only after validation succeeds.
SET NAMES utf8mb4;
DROP TEMPORARY TABLE IF EXISTS tmp_fund_sheet_2026;
DROP TEMPORARY TABLE IF EXISTS tmp_fund_cells_2026;

CREATE TEMPORARY TABLE tmp_fund_sheet_2026 (
  email VARCHAR(191) PRIMARY KEY,
  m02 BIGINT, m03 BIGINT, m04 BIGINT, m05 BIGINT,
  m06 BIGINT, m07 BIGINT, m08 BIGINT, m09 BIGINT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO tmp_fund_sheet_2026 VALUES
('dungvh@phenikaa-x.com', 200000, 100000, NULL, 100000, 200000, 200000, 200000, 200000),
('nampt@phenikaa-x.com', 100000, 100000, NULL, 100000, 150000, 150000, 150000, 150000),
('khamtc@phenikaa-x.com', 900000, 100000, NULL, 100000, 150000, 500000, 100000, 200000),
('kiennt@phenikaa-x.com', 100000, 100000, NULL, 100000, 150000, 150000, 150000, 150000),
('lochd@phenikaa-x.com', 100000, 100000, NULL, 100000, 150000, 150000, 500000, 500000),
('lamnh@phenikaa-x.com', 900000, 100000, NULL, 100000, 150000, 150000, 150000, NULL),
('viethq@phenikaa-x.com', 200000, 100000, NULL, 100000, 150000, 150000, 150000, NULL),
('quybd@phenikaa-x.com', 100000, 100000, NULL, 100000, 150000, 150000, 150000, 150000),
('khanhdd@phenikaa-x.com', 100000, 100000, NULL, 100000, 150000, 150000, 150000, NULL),
('longnt1@phenikaa-x.com', 100000, 100000, NULL, 100000, 150000, 150000, 150000, NULL),
('quyennth@phenikaa-x.com', 2532000, 100000, 1050000, 100000, 1250000, 150000, 150000, 150000),
('longlt@phenikaa-x.com', 200000, 834000, NULL, 100000, 150000, 150000, 150000, 200000),
('anhbvq@phenikaa-x.com', 100000, 100000, NULL, 100000, 150000, 150000, 150000, 150000),
('dungtv@phenikaa-x.com', 100000, 100000, NULL, 100000, 150000, 150000, 150000, 150000),
('hath@phenikaa-x.com', NULL, 100000, NULL, 100000, 150000, 150000, 150000, 150000),
('sangnm@phenikaa-x.com', NULL, NULL, 500000, 100000, 150000, 150000, 150000, 150000),
('sonph1@phenikaa-x.com', NULL, NULL, NULL, 100000, 150000, 150000, 150000, 150000),
('khanhtb@phenikaa-x.com', NULL, NULL, NULL, 100000, 150000, 150000, 150000, 150000),
('lambt@phenikaa-x.com', NULL, NULL, NULL, 50000, 75000, 300000, 75000, 75000),
('cuongnm1@phenikaa-x.com', NULL, NULL, NULL, 100000, 150000, 150000, 150000, NULL),
('tungnb@phenikaa-x.com', NULL, NULL, NULL, 50000, 75000, 50000, 50000, 50000),
('bangnv@phenikaa-x.com', NULL, NULL, NULL, 100000, 150000, 150000, 150000, 150000),
('haint1@phenikaa-x.com', NULL, NULL, NULL, 50000, 100000, 111000, 86000, 87000),
('luongtp@phenikaa-x.com', NULL, NULL, NULL, NULL, 150000, 150000, 100000, NULL),
('sonln1@phenikaa-x.com', NULL, NULL, NULL, NULL, 150000, NULL, 100000, NULL),
('thuyetnt@phenikaa-x.com', NULL, NULL, NULL, NULL, 150000, 150000, 150000, 150000),
('linhnv@phenikaa-x.com', NULL, NULL, NULL, NULL, 100000, 100000, 100000, 100000),
('chunght@phenikaa-x.com', NULL, NULL, NULL, NULL, NULL, 650000, 150000, 150000),
('thanhnt@phenikaa-x.com', NULL, NULL, NULL, NULL, NULL, 150000, 150000, 150000),
('hoangnm@phenikaa-x.com', NULL, NULL, NULL, NULL, NULL, 150000, 150000, 150000);

CREATE TEMPORARY TABLE tmp_fund_cells_2026 AS
SELECT email, month, amount
FROM (
  SELECT s.email, m.month,
    CASE m.month
      WHEN 2 THEN s.m02 WHEN 3 THEN s.m03
      WHEN 4 THEN s.m04 WHEN 5 THEN s.m05
      WHEN 6 THEN s.m06 WHEN 7 THEN s.m07
      WHEN 8 THEN s.m08 WHEN 9 THEN s.m09
    END AS amount
  FROM tmp_fund_sheet_2026 AS s
  CROSS JOIN (
    SELECT 2 AS month UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
    UNION ALL SELECT 8 UNION ALL SELECT 9
  ) AS m
) AS cells
WHERE amount IS NOT NULL;

START TRANSACTION;

-- Must return no rows: each email must identify exactly one existing user.
SELECT s.email, COUNT(u.id) AS matching_users
FROM tmp_fund_sheet_2026 AS s
LEFT JOIN users AS u
  ON CONVERT(LOWER(TRIM(u.email)) USING utf8mb4) COLLATE utf8mb4_unicode_ci = s.email
GROUP BY s.email
HAVING COUNT(u.id) <> 1;

SET @fund_import_ok = (
  SELECT COUNT(*) = 0 FROM (
    SELECT s.email
    FROM tmp_fund_sheet_2026 AS s
    LEFT JOIN users AS u
      ON CONVERT(LOWER(TRIM(u.email)) USING utf8mb4) COLLATE utf8mb4_unicode_ci = s.email
    GROUP BY s.email HAVING COUNT(u.id) <> 1
  ) AS invalid_users
);
SELECT @fund_import_ok AS ready_to_import;

-- Source totals, before touching persisted payments.
SELECT month, COUNT(*) AS payment_count, SUM(amount) AS source_total
FROM tmp_fund_cells_2026 GROUP BY month ORDER BY month;

-- Preserve existing period IDs, opening balances and reminder settings.
INSERT INTO fund_periods (id, year, month, updated_at)
SELECT CONCAT('fund_', UUID()), 2026, m.month, NOW(3)
FROM (SELECT DISTINCT month FROM tmp_fund_cells_2026) AS m
WHERE @fund_import_ok = 1
ON DUPLICATE KEY UPDATE updated_at = fund_periods.updated_at;

-- Reset February-September to the exact sheet state. This prevents stale
-- payments from surviving in cells that are blank in the source.
UPDATE fund_member_payments AS f
JOIN fund_periods AS p ON p.id = f.fund_period_id
SET f.paid = 0,
    f.amount = 0,
    f.paid_at = NULL,
    f.payment_status = NULL,
    f.order_code = NULL,
    f.payment_link_id = NULL,
    f.checkout_url = NULL,
    f.payment_reference = NULL,
    f.approved_by = NULL,
    f.updated_at = NOW(3)
WHERE p.year = 2026
  AND p.month BETWEEN 2 AND 9
  AND @fund_import_ok = 1;

-- Replace every nonblank cell with the exact source amount.
INSERT INTO fund_member_payments
  (fund_period_id, user_id, paid, amount, paid_at, payment_status, updated_at)
SELECT p.id, u.id, 1, s.amount, NULL, 'PAID', NOW(3)
FROM tmp_fund_cells_2026 AS s
JOIN users AS u
  ON CONVERT(LOWER(TRIM(u.email)) USING utf8mb4) COLLATE utf8mb4_unicode_ci = s.email
JOIN fund_periods AS p ON p.year = 2026 AND p.month = s.month
WHERE @fund_import_ok = 1
ON DUPLICATE KEY UPDATE
  paid = 1,
  amount = VALUES(amount),
  paid_at = NULL,
  payment_status = 'PAID',
  updated_at = NOW(3);

-- Every month must have verified_payments = source_payments and equal totals.
SELECT s.month,
       COUNT(*) AS source_payments,
       SUM(s.amount) AS source_total,
       SUM(CASE WHEN f.paid = 1 AND f.amount = s.amount THEN 1 ELSE 0 END) AS verified_payments,
       SUM(CASE WHEN f.paid = 1 THEN f.amount ELSE 0 END) AS database_total
FROM tmp_fund_cells_2026 AS s
JOIN users AS u
  ON CONVERT(LOWER(TRIM(u.email)) USING utf8mb4) COLLATE utf8mb4_unicode_ci = s.email
JOIN fund_periods AS p ON p.year = 2026 AND p.month = s.month
LEFT JOIN fund_member_payments AS f ON f.fund_period_id = p.id AND f.user_id = u.id
GROUP BY s.month ORDER BY s.month;

-- Existing additional income is preserved and should be checked for overlapping entries.
SELECT p.month, t.id, t.title, t.category, t.amount, t.user_id
FROM fund_transactions AS t
JOIN fund_periods AS p ON p.id = t.fund_period_id
WHERE p.year = 2026 AND p.month BETWEEN 2 AND 9 AND t.kind = 'income'
ORDER BY p.month, t.id;

COMMIT;
