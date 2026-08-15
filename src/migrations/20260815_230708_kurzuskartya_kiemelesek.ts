import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products_card_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_products_v_version_card_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "pages_blocks_course_cards" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "pages_blocks_course_cards" ADD COLUMN "cta_label" varchar;
  ALTER TABLE "_pages_v_blocks_course_cards" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_pages_v_blocks_course_cards" ADD COLUMN "cta_label" varchar;
  ALTER TABLE "products_card_highlights" ADD CONSTRAINT "products_card_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_card_highlights" ADD CONSTRAINT "_products_v_version_card_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_card_highlights_order_idx" ON "products_card_highlights" USING btree ("_order");
  CREATE INDEX "products_card_highlights_parent_id_idx" ON "products_card_highlights" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_card_highlights_order_idx" ON "_products_v_version_card_highlights" USING btree ("_order");
  CREATE INDEX "_products_v_version_card_highlights_parent_id_idx" ON "_products_v_version_card_highlights" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_card_highlights" CASCADE;
  DROP TABLE "_products_v_version_card_highlights" CASCADE;
  ALTER TABLE "pages_blocks_course_cards" DROP COLUMN "eyebrow";
  ALTER TABLE "pages_blocks_course_cards" DROP COLUMN "cta_label";
  ALTER TABLE "_pages_v_blocks_course_cards" DROP COLUMN "eyebrow";
  ALTER TABLE "_pages_v_blocks_course_cards" DROP COLUMN "cta_label";`)
}
