import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_appointment_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_appointment_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TABLE "pages_blocks_appointment_idopont_savok" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"felirat" varchar
  );
  
  CREATE TABLE "pages_blocks_appointment_helyszinek" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"cim" varchar,
  	"megjegyzes" varchar
  );
  
  CREATE TABLE "pages_blocks_appointment_telefonszamok" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nev" varchar,
  	"szam" varchar
  );
  
  CREATE TABLE "pages_blocks_appointment" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"lead" varchar,
  	"magyarazat" varchar,
  	"urlap_cim" varchar,
  	"gomb_felirat" varchar,
  	"helyszinek_felirat" varchar,
  	"telefon_felirat" varchar,
  	"email_felirat" varchar,
  	"email" varchar,
  	"siker_cim" varchar,
  	"siker_szoveg" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_appointment_section_settings_hatter" DEFAULT 'tint',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_appointment_idopont_savok" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"felirat" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_appointment_helyszinek" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"cim" varchar,
  	"megjegyzes" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_appointment_telefonszamok" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nev" varchar,
  	"szam" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_appointment" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"lead" varchar,
  	"magyarazat" varchar,
  	"urlap_cim" varchar,
  	"gomb_felirat" varchar,
  	"helyszinek_felirat" varchar,
  	"telefon_felirat" varchar,
  	"email_felirat" varchar,
  	"email" varchar,
  	"siker_cim" varchar,
  	"siker_szoveg" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_appointment_section_settings_hatter" DEFAULT 'tint',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_appointment_idopont_savok" ADD CONSTRAINT "pages_blocks_appointment_idopont_savok_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_appointment"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_appointment_helyszinek" ADD CONSTRAINT "pages_blocks_appointment_helyszinek_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_appointment"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_appointment_telefonszamok" ADD CONSTRAINT "pages_blocks_appointment_telefonszamok_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_appointment"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_appointment" ADD CONSTRAINT "pages_blocks_appointment_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_appointment_idopont_savok" ADD CONSTRAINT "_pages_v_blocks_appointment_idopont_savok_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_appointment"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_appointment_helyszinek" ADD CONSTRAINT "_pages_v_blocks_appointment_helyszinek_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_appointment"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_appointment_telefonszamok" ADD CONSTRAINT "_pages_v_blocks_appointment_telefonszamok_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_appointment"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_appointment" ADD CONSTRAINT "_pages_v_blocks_appointment_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_appointment_idopont_savok_order_idx" ON "pages_blocks_appointment_idopont_savok" USING btree ("_order");
  CREATE INDEX "pages_blocks_appointment_idopont_savok_parent_id_idx" ON "pages_blocks_appointment_idopont_savok" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_appointment_helyszinek_order_idx" ON "pages_blocks_appointment_helyszinek" USING btree ("_order");
  CREATE INDEX "pages_blocks_appointment_helyszinek_parent_id_idx" ON "pages_blocks_appointment_helyszinek" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_appointment_telefonszamok_order_idx" ON "pages_blocks_appointment_telefonszamok" USING btree ("_order");
  CREATE INDEX "pages_blocks_appointment_telefonszamok_parent_id_idx" ON "pages_blocks_appointment_telefonszamok" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_appointment_order_idx" ON "pages_blocks_appointment" USING btree ("_order");
  CREATE INDEX "pages_blocks_appointment_parent_id_idx" ON "pages_blocks_appointment" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_appointment_path_idx" ON "pages_blocks_appointment" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_appointment_idopont_savok_order_idx" ON "_pages_v_blocks_appointment_idopont_savok" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_appointment_idopont_savok_parent_id_idx" ON "_pages_v_blocks_appointment_idopont_savok" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_appointment_helyszinek_order_idx" ON "_pages_v_blocks_appointment_helyszinek" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_appointment_helyszinek_parent_id_idx" ON "_pages_v_blocks_appointment_helyszinek" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_appointment_telefonszamok_order_idx" ON "_pages_v_blocks_appointment_telefonszamok" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_appointment_telefonszamok_parent_id_idx" ON "_pages_v_blocks_appointment_telefonszamok" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_appointment_order_idx" ON "_pages_v_blocks_appointment" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_appointment_parent_id_idx" ON "_pages_v_blocks_appointment" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_appointment_path_idx" ON "_pages_v_blocks_appointment" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_appointment_idopont_savok" CASCADE;
  DROP TABLE "pages_blocks_appointment_helyszinek" CASCADE;
  DROP TABLE "pages_blocks_appointment_telefonszamok" CASCADE;
  DROP TABLE "pages_blocks_appointment" CASCADE;
  DROP TABLE "_pages_v_blocks_appointment_idopont_savok" CASCADE;
  DROP TABLE "_pages_v_blocks_appointment_helyszinek" CASCADE;
  DROP TABLE "_pages_v_blocks_appointment_telefonszamok" CASCADE;
  DROP TABLE "_pages_v_blocks_appointment" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_appointment_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_appointment_section_settings_hatter";`)
}
