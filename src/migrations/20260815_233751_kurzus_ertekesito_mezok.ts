import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products_sales_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "products_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "products_fit_for" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "products_not_fit_for" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "products_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "_products_v_version_sales_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_fit_for" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_not_fit_for" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "products" ADD COLUMN "guarantee_title" varchar;
  ALTER TABLE "products" ADD COLUMN "guarantee_text" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_guarantee_title" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_guarantee_text" varchar;
  ALTER TABLE "products_sales_highlights" ADD CONSTRAINT "products_sales_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_how_it_works" ADD CONSTRAINT "products_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_fit_for" ADD CONSTRAINT "products_fit_for_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_not_fit_for" ADD CONSTRAINT "products_not_fit_for_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_faq" ADD CONSTRAINT "products_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_sales_highlights" ADD CONSTRAINT "_products_v_version_sales_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_how_it_works" ADD CONSTRAINT "_products_v_version_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_fit_for" ADD CONSTRAINT "_products_v_version_fit_for_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_not_fit_for" ADD CONSTRAINT "_products_v_version_not_fit_for_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_faq" ADD CONSTRAINT "_products_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_sales_highlights_order_idx" ON "products_sales_highlights" USING btree ("_order");
  CREATE INDEX "products_sales_highlights_parent_id_idx" ON "products_sales_highlights" USING btree ("_parent_id");
  CREATE INDEX "products_how_it_works_order_idx" ON "products_how_it_works" USING btree ("_order");
  CREATE INDEX "products_how_it_works_parent_id_idx" ON "products_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "products_fit_for_order_idx" ON "products_fit_for" USING btree ("_order");
  CREATE INDEX "products_fit_for_parent_id_idx" ON "products_fit_for" USING btree ("_parent_id");
  CREATE INDEX "products_not_fit_for_order_idx" ON "products_not_fit_for" USING btree ("_order");
  CREATE INDEX "products_not_fit_for_parent_id_idx" ON "products_not_fit_for" USING btree ("_parent_id");
  CREATE INDEX "products_faq_order_idx" ON "products_faq" USING btree ("_order");
  CREATE INDEX "products_faq_parent_id_idx" ON "products_faq" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_sales_highlights_order_idx" ON "_products_v_version_sales_highlights" USING btree ("_order");
  CREATE INDEX "_products_v_version_sales_highlights_parent_id_idx" ON "_products_v_version_sales_highlights" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_how_it_works_order_idx" ON "_products_v_version_how_it_works" USING btree ("_order");
  CREATE INDEX "_products_v_version_how_it_works_parent_id_idx" ON "_products_v_version_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_fit_for_order_idx" ON "_products_v_version_fit_for" USING btree ("_order");
  CREATE INDEX "_products_v_version_fit_for_parent_id_idx" ON "_products_v_version_fit_for" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_not_fit_for_order_idx" ON "_products_v_version_not_fit_for" USING btree ("_order");
  CREATE INDEX "_products_v_version_not_fit_for_parent_id_idx" ON "_products_v_version_not_fit_for" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_faq_order_idx" ON "_products_v_version_faq" USING btree ("_order");
  CREATE INDEX "_products_v_version_faq_parent_id_idx" ON "_products_v_version_faq" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_sales_highlights" CASCADE;
  DROP TABLE "products_how_it_works" CASCADE;
  DROP TABLE "products_fit_for" CASCADE;
  DROP TABLE "products_not_fit_for" CASCADE;
  DROP TABLE "products_faq" CASCADE;
  DROP TABLE "_products_v_version_sales_highlights" CASCADE;
  DROP TABLE "_products_v_version_how_it_works" CASCADE;
  DROP TABLE "_products_v_version_fit_for" CASCADE;
  DROP TABLE "_products_v_version_not_fit_for" CASCADE;
  DROP TABLE "_products_v_version_faq" CASCADE;
  ALTER TABLE "products" DROP COLUMN "guarantee_title";
  ALTER TABLE "products" DROP COLUMN "guarantee_text";
  ALTER TABLE "_products_v" DROP COLUMN "version_guarantee_title";
  ALTER TABLE "_products_v" DROP COLUMN "version_guarantee_text";`)
}
