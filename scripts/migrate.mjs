import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const migrationPath = path.join(process.cwd(), "database", "migrations", "001_initial_schema.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf8");
const sql = postgres(databaseUrl, {
  max: 1,
  ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require"
});

try {
  await sql.unsafe(migrationSql);
  console.log("Database migration completed.");
} finally {
  await sql.end();
}
