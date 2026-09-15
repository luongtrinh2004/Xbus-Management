import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const migrationsDir = path.join(process.cwd(), "database", "migrations");
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
      await connection.query(statement);
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
