import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_team_members_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_team_members_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TABLE "pages_blocks_team_members_members_cv_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"items" varchar
  );
  
  CREATE TABLE "pages_blocks_team_members_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"link_felirat" varchar,
  	"link_url" varchar,
  	"link_uj_ablakban" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_team_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_team_members_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_team_members_members_cv_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"items" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_team_members_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"link_felirat" varchar,
  	"link_url" varchar,
  	"link_uj_ablakban" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_team_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_team_members_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_team_members_members_cv_sections" ADD CONSTRAINT "pages_blocks_team_members_members_cv_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_team_members_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_members_members" ADD CONSTRAINT "pages_blocks_team_members_members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_members_members" ADD CONSTRAINT "pages_blocks_team_members_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_members" ADD CONSTRAINT "pages_blocks_team_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_members_members_cv_sections" ADD CONSTRAINT "_pages_v_blocks_team_members_members_cv_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_team_members_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_members_members" ADD CONSTRAINT "_pages_v_blocks_team_members_members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_members_members" ADD CONSTRAINT "_pages_v_blocks_team_members_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_members" ADD CONSTRAINT "_pages_v_blocks_team_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_team_members_members_cv_sections_order_idx" ON "pages_blocks_team_members_members_cv_sections" USING btree ("_order");
  CREATE INDEX "pages_blocks_team_members_members_cv_sections_parent_id_idx" ON "pages_blocks_team_members_members_cv_sections" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_team_members_members_order_idx" ON "pages_blocks_team_members_members" USING btree ("_order");
  CREATE INDEX "pages_blocks_team_members_members_parent_id_idx" ON "pages_blocks_team_members_members" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_team_members_members_photo_idx" ON "pages_blocks_team_members_members" USING btree ("photo_id");
  CREATE INDEX "pages_blocks_team_members_order_idx" ON "pages_blocks_team_members" USING btree ("_order");
  CREATE INDEX "pages_blocks_team_members_parent_id_idx" ON "pages_blocks_team_members" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_team_members_path_idx" ON "pages_blocks_team_members" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_team_members_members_cv_sections_order_idx" ON "_pages_v_blocks_team_members_members_cv_sections" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_team_members_members_cv_sections_parent_id_idx" ON "_pages_v_blocks_team_members_members_cv_sections" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_team_members_members_order_idx" ON "_pages_v_blocks_team_members_members" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_team_members_members_parent_id_idx" ON "_pages_v_blocks_team_members_members" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_team_members_members_photo_idx" ON "_pages_v_blocks_team_members_members" USING btree ("photo_id");
  CREATE INDEX "_pages_v_blocks_team_members_order_idx" ON "_pages_v_blocks_team_members" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_team_members_parent_id_idx" ON "_pages_v_blocks_team_members" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_team_members_path_idx" ON "_pages_v_blocks_team_members" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_team_members_members_cv_sections" CASCADE;
  DROP TABLE "pages_blocks_team_members_members" CASCADE;
  DROP TABLE "pages_blocks_team_members" CASCADE;
  DROP TABLE "_pages_v_blocks_team_members_members_cv_sections" CASCADE;
  DROP TABLE "_pages_v_blocks_team_members_members" CASCADE;
  DROP TABLE "_pages_v_blocks_team_members" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_team_members_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_team_members_section_settings_hatter";`)
}
