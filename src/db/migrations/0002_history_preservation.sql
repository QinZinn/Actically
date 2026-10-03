DROP INDEX "flashcards_concept_id_index";--> statement-breakpoint
ALTER TABLE "concepts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "mode" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "follow_up_step" integer;--> statement-breakpoint
ALTER TABLE "study_sets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "flashcards_active_concept_unique" ON "flashcards" USING btree ("concept_id") WHERE deleted_at is null;