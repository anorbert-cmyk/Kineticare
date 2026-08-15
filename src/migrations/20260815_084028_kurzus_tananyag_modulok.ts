import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_modules_lessons_kind" AS ENUM('video', 'szoveg', 'link');
  CREATE TYPE "public"."enum_products_modules_lessons_status" AS ENUM('processing', 'ready', 'error');
  CREATE TYPE "public"."enum__products_v_version_modules_lessons_kind" AS ENUM('video', 'szoveg', 'link');
  CREATE TYPE "public"."enum__products_v_version_modules_lessons_status" AS ENUM('processing', 'ready', 'error');
  CREATE TABLE "products_modules_lessons_attachments" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"file_id" integer
  );
  
  CREATE TABLE "products_modules_lessons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"kind" "enum_products_modules_lessons_kind" DEFAULT 'video',
  	"summary" varchar,
  	"stream_asset_id" varchar,
  	"duration_sec" numeric,
  	"status" "enum_products_modules_lessons_status" DEFAULT 'processing',
  	"url" varchar,
  	"content" jsonb
  );
  
  CREATE TABLE "products_modules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"summary" varchar
  );
  
  CREATE TABLE "_products_v_version_modules_lessons_attachments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"file_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_modules_lessons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"kind" "enum__products_v_version_modules_lessons_kind" DEFAULT 'video',
  	"summary" varchar,
  	"stream_asset_id" varchar,
  	"duration_sec" numeric,
  	"status" "enum__products_v_version_modules_lessons_status" DEFAULT 'processing',
  	"url" varchar,
  	"content" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_modules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"summary" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "products_modules_lessons_attachments" ADD CONSTRAINT "products_modules_lessons_attachments_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_modules_lessons_attachments" ADD CONSTRAINT "products_modules_lessons_attachments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_modules_lessons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_modules_lessons" ADD CONSTRAINT "products_modules_lessons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_modules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_modules" ADD CONSTRAINT "products_modules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_modules_lessons_attachments" ADD CONSTRAINT "_products_v_version_modules_lessons_attachments_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_modules_lessons_attachments" ADD CONSTRAINT "_products_v_version_modules_lessons_attachments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_modules_lessons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_modules_lessons" ADD CONSTRAINT "_products_v_version_modules_lessons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_modules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_modules" ADD CONSTRAINT "_products_v_version_modules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_modules_lessons_attachments_order_idx" ON "products_modules_lessons_attachments" USING btree ("_order");
  CREATE INDEX "products_modules_lessons_attachments_parent_id_idx" ON "products_modules_lessons_attachments" USING btree ("_parent_id");
  CREATE INDEX "products_modules_lessons_attachments_file_idx" ON "products_modules_lessons_attachments" USING btree ("file_id");
  CREATE INDEX "products_modules_lessons_order_idx" ON "products_modules_lessons" USING btree ("_order");
  CREATE INDEX "products_modules_lessons_parent_id_idx" ON "products_modules_lessons" USING btree ("_parent_id");
  CREATE INDEX "products_modules_order_idx" ON "products_modules" USING btree ("_order");
  CREATE INDEX "products_modules_parent_id_idx" ON "products_modules" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_modules_lessons_attachments_order_idx" ON "_products_v_version_modules_lessons_attachments" USING btree ("_order");
  CREATE INDEX "_products_v_version_modules_lessons_attachments_parent_id_idx" ON "_products_v_version_modules_lessons_attachments" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_modules_lessons_attachments_file_idx" ON "_products_v_version_modules_lessons_attachments" USING btree ("file_id");
  CREATE INDEX "_products_v_version_modules_lessons_order_idx" ON "_products_v_version_modules_lessons" USING btree ("_order");
  CREATE INDEX "_products_v_version_modules_lessons_parent_id_idx" ON "_products_v_version_modules_lessons" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_modules_order_idx" ON "_products_v_version_modules" USING btree ("_order");
  CREATE INDEX "_products_v_version_modules_parent_id_idx" ON "_products_v_version_modules" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_modules_lessons_attachments" CASCADE;
  DROP TABLE "products_modules_lessons" CASCADE;
  DROP TABLE "products_modules" CASCADE;
  DROP TABLE "_products_v_version_modules_lessons_attachments" CASCADE;
  DROP TABLE "_products_v_version_modules_lessons" CASCADE;
  DROP TABLE "_products_v_version_modules" CASCADE;
  DROP TYPE "public"."enum_products_modules_lessons_kind";
  DROP TYPE "public"."enum_products_modules_lessons_status";
  DROP TYPE "public"."enum__products_v_version_modules_lessons_kind";
  DROP TYPE "public"."enum__products_v_version_modules_lessons_status";`)
}
