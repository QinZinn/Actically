import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { ApiFailure } from "@/server/services/errors";

// Any Drizzle Postgres database (postgres-js in the app, PGlite in tests) or a transaction of one.
export type Db = PgDatabase<PgQueryResultHKT>;

let db: Db | undefined;
export function getDb(): Db {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new ApiFailure("SERVICE_UNAVAILABLE", "Cơ sở dữ liệu chưa được cấu hình.", false);
  // prepare:false keeps Supabase's transaction pooler (port 6543) working.
  db = drizzle(postgres(url, { prepare: false, max: 5 })) as unknown as Db;
  return db;
}
