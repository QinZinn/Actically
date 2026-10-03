CREATE TABLE "ai_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ai_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "card_generations" (
	"user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"card_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_generations_user_id_idempotency_key_unique" UNIQUE("user_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "card_generations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"study_set_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"normalized_title" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"extraction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concepts_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "concepts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text NOT NULL,
	"concept_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duplicate_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extractions_user_id_session_id_idempotency_key_unique" UNIQUE("user_id","session_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "extractions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"study_set_id" uuid NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"scheduler" jsonb NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flashcards_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "flashcards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"study_set_id" uuid,
	"title" text NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_sessions_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "learning_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"solve" jsonb,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_session_id_request_id_role_unique" UNIQUE("session_id","request_id","role")
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "practice_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"study_set_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"learner_text" text NOT NULL,
	"reference_snapshots" jsonb NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"retry_of_id" uuid,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_attempts_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "practice_attempts_user_id_idempotency_key_unique" UNIQUE("user_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "practice_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "practice_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"result" jsonb NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_evaluations_attempt_id_unique" UNIQUE("attempt_id")
);
--> statement-breakpoint
ALTER TABLE "practice_evaluations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"sidebar_collapsed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"presentation_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"rating" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"revision_before" integer NOT NULL,
	"revision_after" integer NOT NULL,
	"state_before" jsonb NOT NULL,
	"state_after" jsonb NOT NULL,
	CONSTRAINT "review_events_user_id_idempotency_key_unique" UNIQUE("user_id","idempotency_key"),
	CONSTRAINT "review_events_card_id_revision_before_unique" UNIQUE("card_id","revision_before")
);
--> statement-breakpoint
ALTER TABLE "review_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "source_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_revisions_source_id_revision_unique" UNIQUE("source_id","revision")
);
--> statement-breakpoint
ALTER TABLE "source_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"study_set_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "study_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_sets_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "study_sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_reservations" ADD CONSTRAINT "ai_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_generations" ADD CONSTRAINT "card_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_generations" ADD CONSTRAINT "card_generations_card_id_user_id_flashcards_id_user_id_fk" FOREIGN KEY ("card_id","user_id") REFERENCES "public"."flashcards"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_study_set_id_user_id_study_sets_id_user_id_fk" FOREIGN KEY ("study_set_id","user_id") REFERENCES "public"."study_sets"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_session_id_user_id_learning_sessions_id_user_id_fk" FOREIGN KEY ("session_id","user_id") REFERENCES "public"."learning_sessions"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_concept_id_user_id_concepts_id_user_id_fk" FOREIGN KEY ("concept_id","user_id") REFERENCES "public"."concepts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_study_set_id_user_id_study_sets_id_user_id_fk" FOREIGN KEY ("study_set_id","user_id") REFERENCES "public"."study_sets"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_study_set_id_user_id_study_sets_id_user_id_fk" FOREIGN KEY ("study_set_id","user_id") REFERENCES "public"."study_sets"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_user_id_learning_sessions_id_user_id_fk" FOREIGN KEY ("session_id","user_id") REFERENCES "public"."learning_sessions"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_study_set_id_user_id_study_sets_id_user_id_fk" FOREIGN KEY ("study_set_id","user_id") REFERENCES "public"."study_sets"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_retry_of_id_user_id_practice_attempts_id_user_id_fk" FOREIGN KEY ("retry_of_id","user_id") REFERENCES "public"."practice_attempts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_evaluations" ADD CONSTRAINT "practice_evaluations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_evaluations" ADD CONSTRAINT "practice_evaluations_attempt_id_user_id_practice_attempts_id_user_id_fk" FOREIGN KEY ("attempt_id","user_id") REFERENCES "public"."practice_attempts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_card_id_user_id_flashcards_id_user_id_fk" FOREIGN KEY ("card_id","user_id") REFERENCES "public"."flashcards"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_revisions" ADD CONSTRAINT "source_revisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_revisions" ADD CONSTRAINT "source_revisions_source_id_user_id_sources_id_user_id_fk" FOREIGN KEY ("source_id","user_id") REFERENCES "public"."sources"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_study_set_id_user_id_study_sets_id_user_id_fk" FOREIGN KEY ("study_set_id","user_id") REFERENCES "public"."study_sets"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sets" ADD CONSTRAINT "study_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_reservations_user_id_created_at_index" ON "ai_reservations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "concepts_user_id_study_set_id_status_index" ON "concepts" USING btree ("user_id","study_set_id","status");--> statement-breakpoint
CREATE INDEX "concepts_user_id_normalized_title_index" ON "concepts" USING btree ("user_id","normalized_title");--> statement-breakpoint
CREATE UNIQUE INDEX "flashcards_concept_id_index" ON "flashcards" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "flashcards_user_id_due_index" ON "flashcards" USING btree ("user_id","due");--> statement-breakpoint
CREATE INDEX "learning_sessions_user_id_updated_at_index" ON "learning_sessions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "messages_session_id_created_at_index" ON "messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "practice_attempts_user_id_created_at_index" ON "practice_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "review_events_card_id_reviewed_at_index" ON "review_events" USING btree ("card_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "sources_study_set_id_index" ON "sources" USING btree ("study_set_id");--> statement-breakpoint
CREATE INDEX "study_sets_user_id_updated_at_index" ON "study_sets" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE POLICY "owner_read" ON "concepts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("concepts"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "flashcards" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("flashcards"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "learning_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("learning_sessions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("messages"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "practice_attempts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("practice_attempts"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "practice_evaluations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("practice_evaluations"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "review_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("review_events"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "source_revisions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("source_revisions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "sources" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("sources"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner_read" ON "study_sets" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("study_sets"."user_id" = (select auth.uid()));