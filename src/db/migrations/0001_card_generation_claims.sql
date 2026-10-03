ALTER TABLE "card_generations" ALTER COLUMN "card_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "card_generations" ADD COLUMN "expected_concept_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "card_generations" ADD COLUMN "status" text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "card_generations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "card_generations" ADD CONSTRAINT "card_generations_concept_id_user_id_concepts_id_user_id_fk" FOREIGN KEY ("concept_id","user_id") REFERENCES "public"."concepts"("id","user_id") ON DELETE cascade ON UPDATE no action;