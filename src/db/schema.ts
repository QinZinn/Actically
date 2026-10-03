import { sql } from "drizzle-orm";
import { boolean, foreignKey, index, integer, jsonb, pgPolicy, pgTable, text, timestamp, unique, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";
import type { ConceptSnapshot } from "@/contracts/ai";
import type { Flashcard, PracticeEvaluation, SolveResult, SourceRef } from "@/contracts/dto";

export type FsrsState = Flashcard["scheduler"];

// Single migration authority: drizzle-kit generates tables, constraints AND RLS policies from this file.
// The app connects with a privileged role that bypasses RLS; services always filter by user_id and
// composite (id, user_id) foreign keys make cross-user links impossible at the database level.
// RLS gives the browser (anon/authenticated via PostgREST) read-only access to its own rows; all writes go through the API.

const id = () => uuid("id").primaryKey().defaultRandom();
const owner = () => uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const dates = () => ({ createdAt: ts("created_at").notNull().defaultNow(), updatedAt: ts("updated_at").notNull().defaultNow() });
const ownRead = (t: { userId: AnyPgColumn }) => pgPolicy("owner_read", { for: "select", to: authenticatedRole, using: sql`${t.userId} = ${authUid}` });
const ownerKey = (t: { id: AnyPgColumn; userId: AnyPgColumn }) => unique().on(t.id, t.userId);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull().default(""),
  timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"),
  sidebarCollapsed: boolean("sidebar_collapsed").notNull().default(false),
  ...dates(),
}, t => [pgPolicy("owner_read", { for: "select", to: authenticatedRole, using: sql`${t.id} = ${authUid}` })]);

export const studySets = pgTable("study_sets", {
  id: id(), userId: owner(),
  subject: text("subject").notNull(), title: text("title").notNull(), description: text("description").notNull().default(""),
  revision: integer("revision").notNull().default(1),
  deletedAt: ts("deleted_at"), // soft delete: reviews/attempts/evaluations under it stay stored
  ...dates(),
}, t => [ownerKey(t), index().on(t.userId, t.updatedAt), ownRead(t)]);

export const sources = pgTable("sources", {
  id: id(), userId: owner(), studySetId: uuid("study_set_id").notNull(),
  title: text("title").notNull(), content: text("content").notNull(),
  revision: integer("revision").notNull().default(1),
  deletedAt: ts("deleted_at"), // soft delete keeps revisions for historical evaluations
  ...dates(),
}, t => [ownerKey(t), foreignKey({ columns: [t.studySetId, t.userId], foreignColumns: [studySets.id, studySets.userId] }).onDelete("cascade"), index().on(t.studySetId), ownRead(t)]);

// Immutable snapshots; every source_ref points at (source_id, revision) here.
export const sourceRevisions = pgTable("source_revisions", {
  id: id(), userId: owner(), sourceId: uuid("source_id").notNull(),
  revision: integer("revision").notNull(), title: text("title").notNull(), content: text("content").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, t => [unique().on(t.sourceId, t.revision), foreignKey({ columns: [t.sourceId, t.userId], foreignColumns: [sources.id, sources.userId] }).onDelete("cascade"), ownRead(t)]);

export const concepts = pgTable("concepts", {
  id: id(), userId: owner(), studySetId: uuid("study_set_id").notNull(),
  title: text("title").notNull(), body: text("body").notNull(), normalizedTitle: text("normalized_title").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  sourceRefs: jsonb("source_refs").$type<SourceRef[]>().notNull().default([]),
  revision: integer("revision").notNull().default(1),
  extractionId: uuid("extraction_id"),
  deletedAt: ts("deleted_at"), // soft delete keeps its card + review history
  ...dates(),
}, t => [ownerKey(t), foreignKey({ columns: [t.studySetId, t.userId], foreignColumns: [studySets.id, studySets.userId] }).onDelete("cascade"),
  index().on(t.userId, t.studySetId, t.status), index().on(t.userId, t.normalizedTitle), ownRead(t)]);

export const learningSessions = pgTable("learning_sessions", {
  id: id(), userId: owner(), studySetId: uuid("study_set_id"), // nulled by service before a study set is deleted
  title: text("title").notNull(), mode: text("mode", { enum: ["socratic", "solve", "ask"] }).notNull(),
  status: text("status", { enum: ["active", "ended"] }).notNull().default("active"),
  ...dates(),
}, t => [ownerKey(t), foreignKey({ columns: [t.studySetId, t.userId], foreignColumns: [studySets.id, studySets.userId] }), index().on(t.userId, t.updatedAt), ownRead(t)]);

export const messages = pgTable("messages", {
  id: id(), userId: owner(), sessionId: uuid("session_id").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull().default(""),
  status: text("status", { enum: ["pending", "streaming", "completed", "failed", "cancelled"] }).notNull(),
  solve: jsonb("solve").$type<SolveResult>(),
  requestId: text("request_id").notNull(),
  // Immutable original request context; replay of a requestId must match content + mode + followUpStep. Null only for legacy rows.
  mode: text("mode", { enum: ["socratic", "solve", "ask"] }),
  followUpStep: integer("follow_up_step"),
  ...dates(),
}, t => [unique().on(t.sessionId, t.requestId, t.role), foreignKey({ columns: [t.sessionId, t.userId], foreignColumns: [learningSessions.id, learningSessions.userId] }).onDelete("cascade"),
  index().on(t.sessionId, t.createdAt), ownRead(t)]);

export const extractions = pgTable("extractions", {
  id: id(), userId: owner(), sessionId: uuid("session_id").notNull(), idempotencyKey: text("idempotency_key").notNull(),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
  conceptIds: jsonb("concept_ids").$type<string[]>().notNull().default([]),
  duplicateWarnings: jsonb("duplicate_warnings").$type<{ title: string; existingConceptId: string }[]>().notNull().default([]),
  ...dates(),
}, t => [unique().on(t.userId, t.sessionId, t.idempotencyKey), foreignKey({ columns: [t.sessionId, t.userId], foreignColumns: [learningSessions.id, learningSessions.userId] }).onDelete("cascade")]).enableRLS();

export const practiceAttempts = pgTable("practice_attempts", {
  id: id(), userId: owner(), studySetId: uuid("study_set_id").notNull(),
  kind: text("kind", { enum: ["feynman", "blurting"] }).notNull(),
  learnerText: text("learner_text").notNull(),
  // Full immutable concept snapshots (title/body/sourceRefs at the referenced revision).
  referenceSnapshots: jsonb("reference_snapshots").$type<ConceptSnapshot[]>().notNull(),
  status: text("status", { enum: ["submitted", "evaluating", "evaluated", "failed"] }).notNull().default("submitted"),
  retryOfId: uuid("retry_of_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  ...dates(),
}, t => [ownerKey(t), unique().on(t.userId, t.idempotencyKey), foreignKey({ columns: [t.studySetId, t.userId], foreignColumns: [studySets.id, studySets.userId] }).onDelete("cascade"),
  foreignKey({ columns: [t.retryOfId, t.userId], foreignColumns: [t.id, t.userId] }), index().on(t.userId, t.createdAt), ownRead(t)]);

export const practiceEvaluations = pgTable("practice_evaluations", {
  id: id(), userId: owner(), attemptId: uuid("attempt_id").notNull(),
  result: jsonb("result").$type<PracticeEvaluation["result"]>().notNull(),
  promptVersion: text("prompt_version").notNull(), model: text("model").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, t => [unique().on(t.attemptId), foreignKey({ columns: [t.attemptId, t.userId], foreignColumns: [practiceAttempts.id, practiceAttempts.userId] }).onDelete("cascade"), ownRead(t)]);

// One card per concept: the unique index enforces "at most one active generated card".
export const flashcards = pgTable("flashcards", {
  id: id(), userId: owner(), conceptId: uuid("concept_id").notNull(), studySetId: uuid("study_set_id").notNull(),
  front: text("front").notNull(), back: text("back").notNull(),
  sourceRefs: jsonb("source_refs").$type<SourceRef[]>().notNull().default([]),
  revision: integer("revision").notNull().default(1),
  scheduler: jsonb("scheduler").$type<FsrsState>().notNull(),
  due: ts("due").notNull(),
  deletedAt: ts("deleted_at"), // soft delete: review_events stay append-only
  ...dates(),
}, t => [ownerKey(t), uniqueIndex("flashcards_active_concept_unique").on(t.conceptId).where(sql`deleted_at is null`), foreignKey({ columns: [t.conceptId, t.userId], foreignColumns: [concepts.id, concepts.userId] }).onDelete("cascade"),
  foreignKey({ columns: [t.studySetId, t.userId], foreignColumns: [studySets.id, studySets.userId] }).onDelete("cascade"), index().on(t.userId, t.due), ownRead(t)]);

// Idempotency claim taken BEFORE the AI call: running → completed (card_id set) | failed (retryable). Defaults keep 0000-era rows valid.
export const cardGenerations = pgTable("card_generations", {
  userId: owner(), idempotencyKey: text("idempotency_key").notNull(), cardId: uuid("card_id"), conceptId: uuid("concept_id").notNull(),
  expectedConceptRevision: integer("expected_concept_revision").notNull().default(0),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull().default("completed"),
  ...dates(),
}, t => [unique().on(t.userId, t.idempotencyKey), foreignKey({ columns: [t.cardId, t.userId], foreignColumns: [flashcards.id, flashcards.userId] }).onDelete("cascade"),
  foreignKey({ columns: [t.conceptId, t.userId], foreignColumns: [concepts.id, concepts.userId] }).onDelete("cascade")]).enableRLS();

// Append-only. unique(card_id, revision_before) makes a double grade of one presentation impossible.
export const reviewEvents = pgTable("review_events", {
  id: id(), userId: owner(), cardId: uuid("card_id").notNull(),
  presentationId: text("presentation_id").notNull(), idempotencyKey: text("idempotency_key").notNull(),
  rating: text("rating", { enum: ["again", "hard", "good", "easy"] }).notNull(),
  reviewedAt: ts("reviewed_at").notNull(),
  revisionBefore: integer("revision_before").notNull(), revisionAfter: integer("revision_after").notNull(),
  stateBefore: jsonb("state_before").$type<FsrsState>().notNull(), stateAfter: jsonb("state_after").$type<FsrsState>().notNull(),
}, t => [unique().on(t.userId, t.idempotencyKey), unique().on(t.cardId, t.revisionBefore),
  foreignKey({ columns: [t.cardId, t.userId], foreignColumns: [flashcards.id, flashcards.userId] }).onDelete("cascade"), index().on(t.cardId, t.reviewedAt), ownRead(t)]);

// Persistent per-user AI rate limit (rolling window + in-flight cap). Server-only, no RLS policy => no client access.
export const aiReservations = pgTable("ai_reservations", {
  id: id(), userId: owner(), operation: text("operation").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(), expiresAt: ts("expires_at").notNull(), releasedAt: ts("released_at"),
}, t => [index().on(t.userId, t.createdAt)]).enableRLS();
