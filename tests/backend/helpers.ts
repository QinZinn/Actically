import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { AiLearningService } from "@/contracts/ai";
import type { Db } from "@/db/client";
import { unconfiguredAi } from "@/server/ai/unconfigured";
import type { Ctx } from "@/server/services/context";
import { createConcept, createSource, createStudySet, updateConcept } from "@/server/services/knowledge";

/**
 * Real PostgreSQL (PGlite, in-process) with the real migrations applied.
 * NOT Supabase: auth.users / auth.uid() / roles below are a minimal shim so FKs and RLS policies can run.
 */
export async function setupDb() {
  const pg = new PGlite();
  await pg.exec(`
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);
  const db = drizzle(pg);
  await migrate(db, { migrationsFolder: "src/db/migrations" });
  // Mirrors Supabase's default grants; RLS policies decide what is actually visible.
  await pg.exec(`grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;`);
  return { pg, db: db as unknown as Db };
}

export async function createUser(pg: PGlite) {
  const id = crypto.randomUUID();
  await pg.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@test.local`]);
  return id;
}

export function ctxFor(db: Db, userId: string, ai: Partial<AiLearningService> = {}, now?: () => Date): Ctx {
  return { db, userId, email: null, ai: { ...unconfiguredAi, ...ai }, requestId: crypto.randomUUID(), now };
}

export async function readSse(res: Response) {
  const text = await res.text();
  return text.split("\n\n").filter(Boolean).map(block => {
    const [ev, data] = block.split("\n");
    return { event: ev.replace("event: ", ""), data: JSON.parse(data.replace("data: ", "")) };
  });
}

export const key = () => crypto.randomUUID();

export const SOURCE_TEXT = "Xác suất có điều kiện: P(A|B) = P(A∩B)/P(B) với P(B) > 0. Hai biến cố độc lập khi P(A∩B) = P(A)P(B).";

/** Study set + source + one APPROVED concept grounded in the source. */
export async function seedApprovedConcept(ctx: Ctx) {
  const set = await createStudySet(ctx, { subject: "Xác suất", title: "Xác suất có điều kiện", description: "" });
  const src = await createSource(ctx, set.id, { title: "Giáo trình", content: SOURCE_TEXT });
  const pending = await createConcept(ctx, { studySetId: set.id, title: "Xác suất có điều kiện", body: "P(A|B) = P(A∩B)/P(B) khi P(B) > 0.",
    sourceRefs: [{ sourceId: src.id, revision: 1, excerpt: "P(A|B) = P(A∩B)/P(B)" }] });
  const concept = await updateConcept(ctx, pending.id, { status: "approved", expectedRevision: pending.revision });
  return { set, src, concept };
}

export const fakeFlashcard = (sourceId: string): Partial<AiLearningService> => ({
  generateFlashcard: async () => ({ front: "Công thức xác suất có điều kiện?", back: "P(A|B) = P(A∩B)/P(B)", sourceRefs: [{ sourceId, revision: 1, excerpt: "P(A|B) = P(A∩B)/P(B)" }] }),
});
