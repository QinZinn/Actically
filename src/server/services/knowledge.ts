import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Concept, Source, SourceRef, StudySet } from "@/contracts/dto";
import type { ConceptCreate, ConceptUpdate, SourceCreate, SourceUpdate, StudySetCreate, StudySetUpdate } from "@/contracts/requests";
import type { Db } from "@/db/client";
import { concepts, learningSessions, sourceRevisions, sources, studySets } from "@/db/schema";
import type { ListParams } from "@/server/auth/route";
import { iso, normalizeTitle, nowOf, type Ctx } from "./context";
import { ApiFailure, conflict, notFound } from "./errors";

type StudySetRow = typeof studySets.$inferSelect;
type SourceRow = typeof sources.$inferSelect;
type ConceptRow = typeof concepts.$inferSelect;
const dates = (r: { createdAt: Date; updatedAt: Date }) => ({ createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt) });
export const toStudySet = (r: StudySetRow): StudySet => ({ id: r.id, subject: r.subject, title: r.title, description: r.description, revision: r.revision, ...dates(r) });
const toSource = (r: SourceRow): Source => ({ id: r.id, studySetId: r.studySetId, title: r.title, content: r.content, revision: r.revision, ...dates(r) });
export const toConcept = (r: ConceptRow): Concept => ({ id: r.id, studySetId: r.studySetId, title: r.title, body: r.body, status: r.status, sourceRefs: r.sourceRefs, revision: r.revision, ...dates(r) });

/** Conditional update missed: distinguish not-owned/missing (404) from stale revision (409). */
async function missed(exists: Promise<unknown[]>): Promise<never> {
  throw (await exists).length ? conflict() : notFound();
}

// ---------- study sets ----------
export async function getStudySet(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(studySets).where(and(eq(studySets.id, id), eq(studySets.userId, userId)));
  if (!row) throw notFound();
  return row;
}
export async function listStudySets(ctx: Ctx) {
  return (await ctx.db.select().from(studySets).where(eq(studySets.userId, ctx.userId)).orderBy(desc(studySets.updatedAt))).map(toStudySet);
}
export async function createStudySet(ctx: Ctx, input: StudySetCreate) {
  const [row] = await ctx.db.insert(studySets).values({ ...input, userId: ctx.userId }).returning();
  return toStudySet(row);
}
export async function updateStudySet(ctx: Ctx, id: string, { expectedRevision, ...patch }: StudySetUpdate) {
  const where = and(eq(studySets.id, id), eq(studySets.userId, ctx.userId));
  const [row] = await ctx.db.update(studySets).set({ ...patch, revision: sql`${studySets.revision} + 1`, updatedAt: nowOf(ctx) })
    .where(and(where, eq(studySets.revision, expectedRevision))).returning();
  return row ? toStudySet(row) : missed(ctx.db.select({ id: studySets.id }).from(studySets).where(where));
}
export async function deleteStudySet(ctx: Ctx, id: string) {
  await ctx.db.transaction(async tx => {
    await getStudySet(tx, ctx.userId, id);
    // Sessions outlive their study set (composite FK cannot SET NULL only one column).
    await tx.update(learningSessions).set({ studySetId: null }).where(and(eq(learningSessions.studySetId, id), eq(learningSessions.userId, ctx.userId)));
    await tx.delete(studySets).where(and(eq(studySets.id, id), eq(studySets.userId, ctx.userId)));
  });
}

// ---------- sources (every revision is kept as an immutable snapshot) ----------
export async function listSources(ctx: Ctx, studySetId: string) {
  await getStudySet(ctx.db, ctx.userId, studySetId);
  const rows = await ctx.db.select().from(sources)
    .where(and(eq(sources.studySetId, studySetId), eq(sources.userId, ctx.userId), isNull(sources.deletedAt))).orderBy(desc(sources.updatedAt));
  return rows.map(toSource);
}
export async function createSource(ctx: Ctx, studySetId: string, input: SourceCreate) {
  return ctx.db.transaction(async tx => {
    await getStudySet(tx, ctx.userId, studySetId);
    const [row] = await tx.insert(sources).values({ ...input, studySetId, userId: ctx.userId }).returning();
    await tx.insert(sourceRevisions).values({ userId: ctx.userId, sourceId: row.id, revision: 1, title: row.title, content: row.content });
    return toSource(row);
  });
}
export async function updateSource(ctx: Ctx, id: string, { expectedRevision, ...patch }: SourceUpdate) {
  return ctx.db.transaction(async tx => {
    const where = and(eq(sources.id, id), eq(sources.userId, ctx.userId), isNull(sources.deletedAt));
    const [row] = await tx.update(sources).set({ ...patch, revision: sql`${sources.revision} + 1`, updatedAt: nowOf(ctx) })
      .where(and(where, eq(sources.revision, expectedRevision))).returning();
    if (!row) return missed(tx.select({ id: sources.id }).from(sources).where(where));
    await tx.insert(sourceRevisions).values({ userId: ctx.userId, sourceId: row.id, revision: row.revision, title: row.title, content: row.content });
    return toSource(row);
  });
}
export async function deleteSource(ctx: Ctx, id: string) {
  const [row] = await ctx.db.update(sources).set({ deletedAt: nowOf(ctx) })
    .where(and(eq(sources.id, id), eq(sources.userId, ctx.userId), isNull(sources.deletedAt))).returning({ id: sources.id });
  if (!row) throw notFound();
}

/** Current, owned, non-deleted sources of a study set as AI snapshots. */
export async function sourceSnapshots(db: Db, userId: string, studySetId: string | null) {
  if (!studySetId) return [];
  const rows = await db.select().from(sources).where(and(eq(sources.studySetId, studySetId), eq(sources.userId, userId), isNull(sources.deletedAt)));
  return rows.map(r => ({ sourceId: r.id, revision: r.revision, title: r.title, content: r.content }));
}

/** Exact historical source revisions referenced by refs (owner-scoped). */
export async function sourceRevisionSnapshots(db: Db, userId: string, refs: SourceRef[]) {
  const unique = [...new Map(refs.map(r => [`${r.sourceId}@${r.revision}`, r])).values()];
  const out = [];
  for (const ref of unique) {
    const [row] = await db.select().from(sourceRevisions)
      .where(and(eq(sourceRevisions.sourceId, ref.sourceId), eq(sourceRevisions.revision, ref.revision), eq(sourceRevisions.userId, userId)));
    if (row) out.push({ sourceId: row.sourceId, revision: row.revision, title: row.title, content: row.content });
  }
  return out;
}

/** Every ref must point to an owned source revision in the same study set and quote it verbatim. */
export async function verifySourceRefs(db: Db, userId: string, studySetId: string, refs: SourceRef[]) {
  for (const ref of refs) {
    const [row] = await db.select({ content: sourceRevisions.content }).from(sourceRevisions)
      .innerJoin(sources, and(eq(sources.id, sourceRevisions.sourceId), eq(sources.userId, userId)))
      .where(and(eq(sourceRevisions.sourceId, ref.sourceId), eq(sourceRevisions.revision, ref.revision), eq(sourceRevisions.userId, userId), eq(sources.studySetId, studySetId)));
    if (!row || !row.content.includes(ref.excerpt)) throw new ApiFailure("VALIDATION_ERROR", "Trích dẫn nguồn không khớp với nguồn đã lưu.");
  }
  return refs;
}

// ---------- concepts ----------
export async function getConcept(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(concepts).where(and(eq(concepts.id, id), eq(concepts.userId, userId)));
  if (!row) throw notFound();
  return row;
}
export async function listConcepts(ctx: Ctx, q: ListParams) {
  const rows = await ctx.db.select().from(concepts).where(and(eq(concepts.userId, ctx.userId),
    q.studySetId ? eq(concepts.studySetId, q.studySetId) : undefined, q.status ? eq(concepts.status, q.status) : undefined))
    .orderBy(desc(concepts.updatedAt)).limit(q.limit).offset(q.offset);
  return rows.map(toConcept);
}
export async function createConcept(ctx: Ctx, input: ConceptCreate) {
  await getStudySet(ctx.db, ctx.userId, input.studySetId);
  await verifySourceRefs(ctx.db, ctx.userId, input.studySetId, input.sourceRefs);
  const [row] = await ctx.db.insert(concepts).values({ ...input, userId: ctx.userId, normalizedTitle: normalizeTitle(input.title), status: "pending" }).returning();
  return toConcept(row);
}
export async function updateConcept(ctx: Ctx, id: string, { expectedRevision, ...patch }: ConceptUpdate) {
  const current = await getConcept(ctx.db, ctx.userId, id);
  if (patch.sourceRefs) await verifySourceRefs(ctx.db, ctx.userId, current.studySetId, patch.sourceRefs);
  const where = and(eq(concepts.id, id), eq(concepts.userId, ctx.userId));
  const [row] = await ctx.db.update(concepts).set({ ...patch, ...(patch.title ? { normalizedTitle: normalizeTitle(patch.title) } : {}),
    revision: sql`${concepts.revision} + 1`, updatedAt: nowOf(ctx) }).where(and(where, eq(concepts.revision, expectedRevision))).returning();
  return row ? toConcept(row) : missed(ctx.db.select({ id: concepts.id }).from(concepts).where(where));
}
export async function deleteConcept(ctx: Ctx, id: string) {
  const [row] = await ctx.db.delete(concepts).where(and(eq(concepts.id, id), eq(concepts.userId, ctx.userId))).returning({ id: concepts.id });
  if (!row) throw notFound();
}

/** Approved concepts of a set as AI snapshots. */
export async function approvedConceptSnapshots(db: Db, userId: string, studySetId: string | null) {
  if (!studySetId) return [];
  const rows = await db.select().from(concepts).where(and(eq(concepts.studySetId, studySetId), eq(concepts.userId, userId), eq(concepts.status, "approved")))
    .orderBy(desc(concepts.updatedAt)).limit(30);
  return rows.map(r => ({ ...toConcept(r), status: "approved" as const }));
}
