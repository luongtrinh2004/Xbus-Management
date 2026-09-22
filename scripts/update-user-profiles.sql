-- Source: danh_sach_nhan_su.xlsx; 30 rows, 27 distinct emails.
-- Updates only profile fields for existing emails; no accounts are inserted.
-- Blank Excel cells preserve current values. jira_account is absent in Excel and is preserved.
-- Vietnamese strings use UTF-8 hex literals to avoid input encoding corruption.
-- Run in one session. On any SQL error, execute ROLLBACK; do not COMMIT.
SET NAMES utf8mb4;

START TRANSACTION;

-- haint1@phenikaa-x.com
UPDATE users
SET
  code = CONVERT(0x48C4904B303736 USING utf8mb4),
  name = CONVERT(0x4E677579E1BB856E205468616E682048E1BAA369 USING utf8mb4),
  citizen_id = '001303018411',
  phone = '0965515160',
  birthday = '2003-08-02',
  address = CONVERT(0x54E1BB952031322C204DE1BAAD75204CC6B0C6A16E672C204B69E1BABF6E2048C6B06E672C2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2023-05-06',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'haint1@phenikaa-x.com';

-- lochd@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX029',
  name = CONVERT(0x486FC3A06E6720447579204CE1BB9963 USING utf8mb4),
  citizen_id = '040096005206',
  phone = '0374905051',
  birthday = '1996-12-02',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'lochd@phenikaa-x.com';

-- nampt@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX036',
  name = CONVERT(0x5068616E205468C3A06E68204E616D USING utf8mb4),
  citizen_id = '031095011447',
  phone = '0335861459',
  birthday = '1995-06-01',
  address = CONVERT(0x4368756E672063C6B02048483342204C696E6820C490C3A06D2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-08-31',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'nampt@phenikaa-x.com';

-- dungvh@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX047',
  name = CONVERT(0x56C5A920486FC3A06E672044C5A96E67 USING utf8mb4),
  citizen_id = '001086034807',
  phone = '0833522886',
  birthday = '1986-08-22',
  address = CONVERT(0x503430342054E1BAAD70205468E1BB832042616E2056E1BAAD74204769C3A1204368C3AD6E68205068E1BBA7202D204E67E1BB8D632048C3A0202D2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-02-27',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'dungvh@phenikaa-x.com';

-- viethq@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX019',
  name = CONVERT(0x48C3A0205175E1BB9163205669E1BB8774 USING utf8mb4),
  citizen_id = '019098000731',
  phone = '0384767711',
  birthday = '1998-07-26',
  address = CONVERT(0x54E1BB9520332C207068C6B0E1BB9D6E672053C3B46E672043C3B46E672C205468C3A169204E677579C3AA6E USING utf8mb4),
  citizen_issued_date = '2024-09-05',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'viethq@phenikaa-x.com';

-- kiennt@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX062',
  name = CONVERT(0x4E677579E1BB856E205472756E67204B69C3AA6E USING utf8mb4),
  citizen_id = '001096017077',
  phone = '0372725296',
  birthday = '1996-01-07',
  address = CONVERT(0x5875C3A26E205472756E67205875C3A26E204D61692048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-11-05',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'kiennt@phenikaa-x.com';

-- khamtc@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX170',
  name = CONVERT(0x5472E1BAA76E2043616F204B68C3A26D USING utf8mb4),
  citizen_id = '015096000619',
  phone = '0357278881',
  birthday = '1996-04-11',
  address = CONVERT(0x5875C3A26E20C381492C204CC3A06F20436169 USING utf8mb4),
  citizen_issued_date = '2021-04-25',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'khamtc@phenikaa-x.com';

-- hath@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX335',
  name = CONVERT(0x5472E1BAA76E20486FC3A06E672048C3A0 USING utf8mb4),
  citizen_id = '034203010157',
  phone = '0343227394',
  birthday = '2003-03-20',
  address = CONVERT(0x5468C3B46E205472C3A0204B68C3AA2C2078C3A32054C3A26E20546875E1BAAD6E2C2074E1BB896E682048C6B06E672059C3AA6E USING utf8mb4),
  citizen_issued_date = '2021-09-22',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'hath@phenikaa-x.com';

-- quyennth@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX281',
  name = CONVERT(0x4E677579E1BB856E205468E1BB8B2048E1BB936E6720517579C3AA6E USING utf8mb4),
  citizen_id = '042199012973',
  phone = '0971164320',
  birthday = '1999-06-14',
  address = CONVERT(0x5468E1BAA163682048C3A02C2048C3A02054C4A96E68 USING utf8mb4),
  citizen_issued_date = '2024-07-03',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'quyennth@phenikaa-x.com';

-- lamnh@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX283',
  name = CONVERT(0x4E677579E1BB856E2048E1BBAF75204CC3A26D USING utf8mb4),
  citizen_id = '040093029766',
  phone = '0979072885',
  birthday = '1993-05-26',
  address = CONVERT(0x43C4836E203830362C20746FC3A020637432412C206B687520C3B4207468E1BB8B2076C4836E206B68C3AA2C2048C3A020C490C3B46E672C2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-12-08',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'lamnh@phenikaa-x.com';

-- quybd@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX296',
  name = CONVERT(0x42C3B96920C490C3AC6E68205175C3BD USING utf8mb4),
  citizen_id = '040099007445',
  phone = '0378932134',
  birthday = '1999-09-05',
  address = CONVERT(0x58C3A320546869C3AA6E204E68E1BAAB6E2C2074E1BB896E68204E6768E1BB8720416E USING utf8mb4),
  citizen_issued_date = '2024-12-29',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'quybd@phenikaa-x.com';

-- anhbvq@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX304',
  name = CONVERT(0x42C3B9692056C4836E205175E1BB916320416E68 USING utf8mb4),
  citizen_id = '042202008418',
  phone = '0934400981',
  birthday = '2002-12-16',
  address = CONVERT(0x5468C3A06E682053656E2C2048C3A02054C4A96E68 USING utf8mb4),
  citizen_issued_date = '2021-05-10',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'anhbvq@phenikaa-x.com';

-- longlt@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX308',
  name = CONVERT(0x4CC3AA205475E1BAA56E204C6F6E67 USING utf8mb4),
  citizen_id = '017098008236',
  phone = '0346202828',
  birthday = '1998-04-05',
  address = CONVERT(0x6B6875205468616E682042C3AC6E682C2078C3A32054C3A26E204CE1BAA1632C2074E1BB896E68205068C3BA205468E1BB8D USING utf8mb4),
  citizen_issued_date = '2021-08-11',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'longlt@phenikaa-x.com';

-- dungtv@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX316',
  name = CONVERT(0x5472E1BAA76E205669E1BB87742044C5A96E67 USING utf8mb4),
  citizen_id = '031203000173',
  phone = '0987954471',
  birthday = '2003-01-12',
  address = CONVERT(0x4E67C3B52031333220416E20C490C3A02C20476961205669C3AA6E2C2048E1BAA369205068C3B26E67 USING utf8mb4),
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'dungtv@phenikaa-x.com';

-- khanhdd@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX138',
  name = CONVERT(0xC490E1BAB76E6720C490C3AC6E68204B68C3A16E68 USING utf8mb4),
  citizen_id = '001201008153',
  phone = '0963362748',
  birthday = '2001-07-24',
  address = CONVERT(0x53E1BB9120323420544450205175616E67204D696E682C2044C6B0C6A16E67204EE1BB99692C2048C3A020C490C3B46E672C2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-04-10',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'khanhdd@phenikaa-x.com';

-- longnt@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX169',
  name = CONVERT(0x4E676869C3AA6D205468C3A06E68204C6F6E67 USING utf8mb4),
  citizen_id = '026202000705',
  phone = '0967429675',
  birthday = '2002-10-19',
  address = CONVERT(0x5468C3B46E2050686F6E6720446F616E682C2078C3A32056C4A96E682054C6B0E1BB9D6E672C2074E1BB896E68205068C3BA205468E1BB8D USING utf8mb4),
  citizen_issued_date = '2021-08-14',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'longnt@phenikaa-x.com';

-- bangnv@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX334',
  name = CONVERT(0x4E677579E1BB856E2056C4836E2042E1BAB16E67 USING utf8mb4),
  citizen_id = '001092011412',
  phone = '0963638992',
  birthday = '1992-01-01',
  address = CONVERT(0x74E1BB95203130204B4443204DE1BAAD75204CC6B0C6A16E672C205068C6B0E1BB9D6E67204B69E1BABF6E2048C6B06E672C2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-12-14',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'bangnv@phenikaa-x.com';

-- sangnm@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX346',
  name = CONVERT(0x4E677579E1BB856E204D696E682053616E67 USING utf8mb4),
  citizen_id = '001092033081',
  phone = '0352112102',
  birthday = '1992-07-15',
  address = CONVERT(0x313939205068C3BA205468E1BB8B6E68202D2053C6A16E2054C3A279202D2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2025-09-15',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'sangnm@phenikaa-x.com';

-- cuongnm1@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX353',
  name = CONVERT(0x4E677579E1BB856E204DE1BAA16E682043C6B0E1BB9D6E67 USING utf8mb4),
  citizen_id = '010203005610',
  phone = '0888264006',
  birthday = '2003-12-08',
  address = CONVERT(0x4E67C3B5203434205472E1BAA76E205468C3A1692054C3B46E672C2043E1BAA775204769E1BAA5792C2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-05-09',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'cuongnm1@phenikaa-x.com';

-- sonph1@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX351',
  name = CONVERT(0x5068E1BAA16D20486FC3A06E672053C6A16E USING utf8mb4),
  citizen_id = '038099003330',
  phone = '0345425328',
  birthday = '1999-10-17',
  address = CONVERT(0x4B696D204368756E672C20486FC3A06920C490E1BBA9632C2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2025-12-31',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'sonph1@phenikaa-x.com';

-- khanhtb@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX345',
  name = CONVERT(0x5472E1BAA76E2042E1BAA36F204B68C3A16E68 USING utf8mb4),
  citizen_id = '031095007643',
  phone = '0946844375',
  birthday = '1995-01-26',
  address = CONVERT(0x4368756E672063C6B02041332C2048E1BB8D63207669E1BB876E205175C3A26E20592C207068C6B0E1BB9D6E672048C3A020C490C3B46E67 USING utf8mb4),
  citizen_issued_date = '2021-04-04',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'khanhtb@phenikaa-x.com';

-- lambt@phenikaa-x.com
UPDATE users
SET
  code = CONVERT(0x48C4904B323037 USING utf8mb4),
  name = CONVERT(0x42C3B9692054C3B96E67204CC3A26D USING utf8mb4),
  citizen_id = '01204009817',
  phone = '0865228940',
  birthday = '2004-10-22',
  address = CONVERT(0x4E67C3B5203738204769E1BAA369205068C3B36E67204B696D204C69C3AA6E20C490E1BB916E6720C490612048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-04-25',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'lambt@phenikaa-x.com';

-- tungnb@phenikaa-x.com
UPDATE users
SET
  code = CONVERT(0x48C4904B323038 USING utf8mb4),
  name = CONVERT(0x4E677579E1BB856E2042C3A163682054C3B96E67 USING utf8mb4),
  citizen_id = '001204024066',
  phone = '0963986204',
  birthday = '2004-08-25',
  address = CONVERT(0x43C3A174205175E1BABF2C20486FC3A06920C490E1BBA9632C2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-04-25',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'tungnb@phenikaa-x.com';

-- luongtp@phenikaa-x.com
UPDATE users
SET
  code = CONVERT(0x48C4904B313831 USING utf8mb4),
  name = CONVERT(0x5472E1BB8B6E68205068C3BA63204CC6B0C6A16E67 USING utf8mb4),
  citizen_id = '036204010741',
  phone = '0816260406',
  birthday = '2004-06-04',
  address = CONVERT(0x4BC4905420C490C3B4204E6768C4A9612C2059C3AA6E204E6768C4A9612C2048C3A020C490C3B46E672C2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-05-10',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'luongtp@phenikaa-x.com';

-- hoangnm@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX365',
  name = CONVERT(0x4E677579E1BB856E204D696E6820486FC3A06E67 USING utf8mb4),
  citizen_id = '024202004166',
  phone = '0858812541',
  birthday = '2002-06-01',
  address = CONVERT(0x4E696E682053C6A16E2C78C3A320486FC3A06E672056C3A26E2C54E1BB896E682042C48363204E696E68 USING utf8mb4),
  citizen_issued_date = '2021-09-07',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'hoangnm@phenikaa-x.com';

-- thuyetnt@phenikaa-x.com
UPDATE users
SET
  code = 'PNKX371',
  name = CONVERT(0x4E677579E1BB856E205468E1BB8B2054687579E1BABF74 USING utf8mb4),
  citizen_id = '001188003441',
  phone = '0936288144',
  birthday = '1988-04-14',
  address = CONVERT(0x3337452C206E67C3B52031383020C491C6B0E1BB9D6E6720E1BBB6204C612C207068C6B0E1BB9D6E672044C6B0C6A16E67204EE1BB99692C2048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-04-29',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'thuyetnt@phenikaa-x.com';

-- sonln1@phenikaa-x.com
UPDATE users
SET
  code = CONVERT(0x48C4904B323133 USING utf8mb4),
  name = CONVERT(0x4CC3AA204E67E1BB8D632053C6A16E USING utf8mb4),
  citizen_id = '038205022188',
  phone = '0966937828',
  birthday = '2005-07-30',
  address = CONVERT(0x53E1BB91203230204E67C3A16368203335206E67C3B5203637205068C3B96E67204B686F616E672048C3A0204EE1BB9969 USING utf8mb4),
  citizen_issued_date = '2021-08-17',
  updated_at = NOW(3)
WHERE LOWER(TRIM(email)) = 'sonln1@phenikaa-x.com';

-- Excel emails with no matching existing account (these were not updated).
SELECT source.email AS email_not_found
FROM (
SELECT 'haint1@phenikaa-x.com' AS email
UNION ALL
SELECT 'lochd@phenikaa-x.com'
UNION ALL
SELECT 'nampt@phenikaa-x.com'
UNION ALL
SELECT 'dungvh@phenikaa-x.com'
UNION ALL
SELECT 'viethq@phenikaa-x.com'
UNION ALL
SELECT 'kiennt@phenikaa-x.com'
UNION ALL
SELECT 'khamtc@phenikaa-x.com'
UNION ALL
SELECT 'hath@phenikaa-x.com'
UNION ALL
SELECT 'quyennth@phenikaa-x.com'
UNION ALL
SELECT 'lamnh@phenikaa-x.com'
UNION ALL
SELECT 'quybd@phenikaa-x.com'
UNION ALL
SELECT 'anhbvq@phenikaa-x.com'
UNION ALL
SELECT 'longlt@phenikaa-x.com'
UNION ALL
SELECT 'dungtv@phenikaa-x.com'
UNION ALL
SELECT 'khanhdd@phenikaa-x.com'
UNION ALL
SELECT 'longnt@phenikaa-x.com'
UNION ALL
SELECT 'bangnv@phenikaa-x.com'
UNION ALL
SELECT 'sangnm@phenikaa-x.com'
UNION ALL
SELECT 'cuongnm1@phenikaa-x.com'
UNION ALL
SELECT 'sonph1@phenikaa-x.com'
UNION ALL
SELECT 'khanhtb@phenikaa-x.com'
UNION ALL
SELECT 'lambt@phenikaa-x.com'
UNION ALL
SELECT 'tungnb@phenikaa-x.com'
UNION ALL
SELECT 'luongtp@phenikaa-x.com'
UNION ALL
SELECT 'hoangnm@phenikaa-x.com'
UNION ALL
SELECT 'thuyetnt@phenikaa-x.com'
UNION ALL
SELECT 'sonln1@phenikaa-x.com'
) AS source
WHERE NOT EXISTS (
  SELECT 1 FROM users AS u WHERE LOWER(TRIM(u.email)) = source.email
);

-- Review updated profile data before committing.
SELECT email, code, name, HEX(name) AS name_hex, jira_account,
       citizen_id, phone, birthday, address, HEX(address) AS address_hex,
       citizen_issued_date
FROM users
WHERE LOWER(TRIM(email)) IN (
  'haint1@phenikaa-x.com',
  'lochd@phenikaa-x.com',
  'nampt@phenikaa-x.com',
  'dungvh@phenikaa-x.com',
  'viethq@phenikaa-x.com',
  'kiennt@phenikaa-x.com',
  'khamtc@phenikaa-x.com',
  'hath@phenikaa-x.com',
  'quyennth@phenikaa-x.com',
  'lamnh@phenikaa-x.com',
  'quybd@phenikaa-x.com',
  'anhbvq@phenikaa-x.com',
  'longlt@phenikaa-x.com',
  'dungtv@phenikaa-x.com',
  'khanhdd@phenikaa-x.com',
  'longnt@phenikaa-x.com',
  'bangnv@phenikaa-x.com',
  'sangnm@phenikaa-x.com',
  'cuongnm1@phenikaa-x.com',
  'sonph1@phenikaa-x.com',
  'khanhtb@phenikaa-x.com',
  'lambt@phenikaa-x.com',
  'tungnb@phenikaa-x.com',
  'luongtp@phenikaa-x.com',
  'hoangnm@phenikaa-x.com',
  'thuyetnt@phenikaa-x.com',
  'sonln1@phenikaa-x.com'
)
ORDER BY email;

-- After reviewing, execute ONE command below in the SAME session:
-- COMMIT;
-- ROLLBACK;
