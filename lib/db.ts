import postgres from "postgres";

let sqlClient: postgres.Sql | null = null;

export function hasDatabaseEnv() {
  return Boolean(getDatabaseUrl());
}

export function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL.");
  }

  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, {
      max: 3,
      ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require"
    });
  }

  return sqlClient;
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}
