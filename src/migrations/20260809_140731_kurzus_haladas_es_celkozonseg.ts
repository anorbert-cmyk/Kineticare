import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_audience" AS ENUM('laikus', 'szakember');
  CREATE TYPE "public"."enum__products_v_version_audience" AS ENUM('laikus', 'szakember');
  CREATE TABLE "course_progress" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"product_id" integer NOT NULL,
  	"video_ref" varchar NOT NULL,
  	"watched_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "products" ADD COLUMN "audience" "enum_products_audience" DEFAULT 'laikus';
  ALTER TABLE "_products_v" ADD COLUMN "version_audience" "enum__products_v_version_audience" DEFAULT 'laikus';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "course_progress_id" integer;
  ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "course_progress_user_idx" ON "course_progress" USING btree ("user_id");
  CREATE INDEX "course_progress_product_idx" ON "course_progress" USING btree ("product_id");
  CREATE INDEX "course_progress_video_ref_idx" ON "course_progress" USING btree ("video_ref");
  CREATE INDEX "course_progress_updated_at_idx" ON "course_progress" USING btree ("updated_at");
  CREATE INDEX "course_progress_created_at_idx" ON "course_progress" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_product_videoRef_idx" ON "course_progress" USING btree ("user_id","product_id","video_ref");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_course_progress_fk" FOREIGN KEY ("course_progress_id") REFERENCES "public"."course_progress"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_course_progress_id_idx" ON "payload_locked_documents_rels" USING btree ("course_progress_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "course_progress" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "course_progress" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_course_progress_fk";
  
  DROP INDEX "payload_locked_documents_rels_course_progress_id_idx";
  ALTER TABLE "products" DROP COLUMN "audience";
  ALTER TABLE "_products_v" DROP COLUMN "version_audience";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "course_progress_id";
  DROP TYPE "public"."enum_products_audience";
  DROP TYPE "public"."enum__products_v_version_audience";`)
}
