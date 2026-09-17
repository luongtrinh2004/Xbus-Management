import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const migrationsDir = path.join(process.cwd(), "database", "migrations");
const initialEnvironment = new Set(Object.keys(process.env));
const loadEnvFile = (filename) => {
  const filepath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filepath)) return;
  for (const line of fs.readFileSync(filepath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || initialEnvironment.has(match[1])) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
};

loadEnvFile(".env");
loadEnvFile(".env.local");

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL chưa được cấu hình trong .env hoặc .env.local");

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL
    )
  `);
  const [existingUsers] = await connection.query("SHOW TABLES LIKE 'users'");
  if (existingUsers.length) {
    await connection.execute(
      "INSERT IGNORE INTO schema_migrations (filename, applied_at) VALUES ('001_initial_schema.sql', ?)",
      [new Date()],
    );
  }
  const [applied] = await connection.query(
    "SELECT filename FROM schema_migrations",
  );
  const completed = new Set(applied.map((row) => row.filename));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (completed.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    for (const statement of sql
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)) {
      try {
        await connection.query(statement);
      } catch (error) {
        // Một số database cũ đã có cột/index nhưng chưa ghi nhận migration.
        // Chỉ bỏ qua đúng các lỗi đã tồn tại; các lỗi schema khác vẫn phải dừng.
        if (
          ![
            "ER_DUP_FIELDNAME",
            "ER_DUP_KEYNAME",
            "ER_TABLE_EXISTS_ERROR",
          ].includes(error.code)
        )
          throw error;
        console.log(`Skipped existing schema: ${error.code}`);
      }
    }
    await connection.execute(
      "INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)",
      [file, new Date()],
    );
    console.log(`Applied ${file}`);
  }
} finally {
  await connection.end();
}
