import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "posts_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "_posts_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "posts" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "posts" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "posts" ADD COLUMN "next_review_at" timestamp(3) with time zone;
  ALTER TABLE "posts" ADD COLUMN "cta_course_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_reviewed_by_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "_posts_v" ADD COLUMN "version_next_review_at" timestamp(3) with time zone;
  ALTER TABLE "_posts_v" ADD COLUMN "version_cta_course_id" integer;
  ALTER TABLE "users" ADD COLUMN "credentials" varchar;
  ALTER TABLE "users" ADD COLUMN "bio_short" varchar;
  ALTER TABLE "users" ADD COLUMN "portrait_id" integer;
  ALTER TABLE "posts_faq" ADD CONSTRAINT "posts_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_faq" ADD CONSTRAINT "_posts_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_faq_order_idx" ON "posts_faq" USING btree ("_order");
  CREATE INDEX "posts_faq_parent_id_idx" ON "posts_faq" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_faq_order_idx" ON "_posts_v_version_faq" USING btree ("_order");
  CREATE INDEX "_posts_v_version_faq_parent_id_idx" ON "_posts_v_version_faq" USING btree ("_parent_id");
  ALTER TABLE "posts" ADD CONSTRAINT "posts_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cta_course_id_products_id_fk" FOREIGN KEY ("cta_course_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_cta_course_id_products_id_fk" FOREIGN KEY ("version_cta_course_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_reviewed_by_idx" ON "posts" USING btree ("reviewed_by_id");
  CREATE INDEX "posts_cta_course_idx" ON "posts" USING btree ("cta_course_id");
  CREATE INDEX "_posts_v_version_version_reviewed_by_idx" ON "_posts_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "_posts_v_version_version_cta_course_idx" ON "_posts_v" USING btree ("version_cta_course_id");
  CREATE INDEX "users_portrait_idx" ON "users" USING btree ("portrait_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_faq" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_faq" CASCADE;
  DROP TABLE "_posts_v_version_faq" CASCADE;
  ALTER TABLE "posts" DROP CONSTRAINT "posts_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "posts" DROP CONSTRAINT "posts_cta_course_id_products_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_cta_course_id_products_id_fk";
  
  ALTER TABLE "users" DROP CONSTRAINT "users_portrait_id_media_id_fk";
  
  DROP INDEX "posts_reviewed_by_idx";
  DROP INDEX "posts_cta_course_idx";
  DROP INDEX "_posts_v_version_version_reviewed_by_idx";
  DROP INDEX "_posts_v_version_version_cta_course_idx";
  DROP INDEX "users_portrait_idx";
  ALTER TABLE "posts" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "posts" DROP COLUMN "reviewed_at";
  ALTER TABLE "posts" DROP COLUMN "next_review_at";
  ALTER TABLE "posts" DROP COLUMN "cta_course_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_reviewed_by_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_reviewed_at";
  ALTER TABLE "_posts_v" DROP COLUMN "version_next_review_at";
  ALTER TABLE "_posts_v" DROP COLUMN "version_cta_course_id";
  ALTER TABLE "users" DROP COLUMN "credentials";
  ALTER TABLE "users" DROP COLUMN "bio_short";
  ALTER TABLE "users" DROP COLUMN "portrait_id";`)
}
