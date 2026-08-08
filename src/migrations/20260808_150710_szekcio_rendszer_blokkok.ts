import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_creds_strip_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_course_cards_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_free_sos_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_press_logos_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_welcome_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_usps_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_states_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_services_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_about_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_how_it_works_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_knowledge_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_faq_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum_pages_blocks_cta_banner_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_creds_strip_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_course_cards_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_free_sos_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_press_logos_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_welcome_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_usps_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_states_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_services_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_about_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_how_it_works_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_knowledge_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TYPE "public"."enum__pages_v_blocks_cta_banner_section_settings_hatter" AS ENUM('feher', 'tint', 'sotet');
  CREATE TABLE "pages_blocks_film_hero_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "pages_blocks_film_hero_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"felirat" varchar,
  	"url" varchar,
  	"uj_ablakban" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_film_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_creds_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_creds_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_felirat" varchar,
  	"link_url" varchar,
  	"link_uj_ablakban" boolean DEFAULT false,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_creds_strip_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_course_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_course_cards_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_free_sos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"cta_felirat" varchar,
  	"cta_url" varchar,
  	"cta_uj_ablakban" boolean DEFAULT false,
  	"background_image_id" integer,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_free_sos_section_settings_hatter" DEFAULT 'tint',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_press_logos_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"alt" varchar,
  	"url" varchar,
  	"uj_ablakban" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_press_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_press_logos_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_welcome_checklist" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_welcome_side_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"emphasized" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_welcome" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_welcome_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_usps_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"extra" varchar
  );
  
  CREATE TABLE "pages_blocks_usps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_usps_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_states_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"number" varchar,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_states" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_states_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_services_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"title" varchar,
  	"body" varchar,
  	"felirat" varchar,
  	"url" varchar,
  	"uj_ablakban" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_services" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"image_id" integer,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_services_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_about_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"emphasized" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_about_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "pages_blocks_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"feature_label" varchar,
  	"feature_note" varchar,
  	"photo_id" integer,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_about_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_how_it_works_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"max_items" numeric DEFAULT 3,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_testimonials_section_settings_hatter" DEFAULT 'tint',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_knowledge" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"limit" numeric DEFAULT 3,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_knowledge_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_faq_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_rich_text_section_settings_hatter" DEFAULT 'feher',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cta_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"cta_felirat" varchar,
  	"cta_url" varchar,
  	"cta_uj_ablakban" boolean DEFAULT false,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum_pages_blocks_cta_banner_section_settings_hatter" DEFAULT 'tint',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_film_hero_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_film_hero_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"felirat" varchar,
  	"url" varchar,
  	"uj_ablakban" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_film_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_creds_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_creds_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_felirat" varchar,
  	"link_url" varchar,
  	"link_uj_ablakban" boolean DEFAULT false,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_creds_strip_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_course_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_course_cards_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_free_sos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"cta_felirat" varchar,
  	"cta_url" varchar,
  	"cta_uj_ablakban" boolean DEFAULT false,
  	"background_image_id" integer,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_free_sos_section_settings_hatter" DEFAULT 'tint',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_press_logos_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"alt" varchar,
  	"url" varchar,
  	"uj_ablakban" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_press_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_press_logos_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_welcome_checklist" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_welcome_side_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"emphasized" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_welcome" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_welcome_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_usps_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"extra" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_usps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_usps_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_states_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"number" varchar,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_states" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"lead" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_states_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_services_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"title" varchar,
  	"body" varchar,
  	"felirat" varchar,
  	"url" varchar,
  	"uj_ablakban" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_services" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"image_id" integer,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_services_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_about_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"emphasized" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_about_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"feature_label" varchar,
  	"feature_note" varchar,
  	"photo_id" integer,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_about_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_how_it_works_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"max_items" numeric DEFAULT 3,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_testimonials_section_settings_hatter" DEFAULT 'tint',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_knowledge" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"limit" numeric DEFAULT 3,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_knowledge_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_faq_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_rich_text_section_settings_hatter" DEFAULT 'feher',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"cta_felirat" varchar,
  	"cta_url" varchar,
  	"cta_uj_ablakban" boolean DEFAULT false,
  	"section_settings_visible" boolean DEFAULT true,
  	"section_settings_anchor_id" varchar,
  	"section_settings_hatter" "enum__pages_v_blocks_cta_banner_section_settings_hatter" DEFAULT 'tint',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_film_hero_tags" ADD CONSTRAINT "pages_blocks_film_hero_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_film_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_film_hero_ctas" ADD CONSTRAINT "pages_blocks_film_hero_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_film_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_film_hero" ADD CONSTRAINT "pages_blocks_film_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_creds_strip_items" ADD CONSTRAINT "pages_blocks_creds_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_creds_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_creds_strip" ADD CONSTRAINT "pages_blocks_creds_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_course_cards" ADD CONSTRAINT "pages_blocks_course_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_free_sos" ADD CONSTRAINT "pages_blocks_free_sos_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_free_sos" ADD CONSTRAINT "pages_blocks_free_sos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_press_logos_logos" ADD CONSTRAINT "pages_blocks_press_logos_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_press_logos_logos" ADD CONSTRAINT "pages_blocks_press_logos_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_press_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_press_logos" ADD CONSTRAINT "pages_blocks_press_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_welcome_checklist" ADD CONSTRAINT "pages_blocks_welcome_checklist_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_welcome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_welcome_side_paragraphs" ADD CONSTRAINT "pages_blocks_welcome_side_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_welcome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_welcome" ADD CONSTRAINT "pages_blocks_welcome_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_usps_cards" ADD CONSTRAINT "pages_blocks_usps_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_usps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_usps" ADD CONSTRAINT "pages_blocks_usps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_states_cards" ADD CONSTRAINT "pages_blocks_states_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_states_cards" ADD CONSTRAINT "pages_blocks_states_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_states" ADD CONSTRAINT "pages_blocks_states_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_services_rows" ADD CONSTRAINT "pages_blocks_services_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_services" ADD CONSTRAINT "pages_blocks_services_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_services" ADD CONSTRAINT "pages_blocks_services_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_about_paragraphs" ADD CONSTRAINT "pages_blocks_about_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_about_stats" ADD CONSTRAINT "pages_blocks_about_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_about" ADD CONSTRAINT "pages_blocks_about_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_about" ADD CONSTRAINT "pages_blocks_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_how_it_works_steps" ADD CONSTRAINT "pages_blocks_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_how_it_works" ADD CONSTRAINT "pages_blocks_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials" ADD CONSTRAINT "pages_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_knowledge" ADD CONSTRAINT "pages_blocks_knowledge_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_banner" ADD CONSTRAINT "pages_blocks_cta_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_hero_tags" ADD CONSTRAINT "_pages_v_blocks_film_hero_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_film_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_hero_ctas" ADD CONSTRAINT "_pages_v_blocks_film_hero_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_film_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_hero" ADD CONSTRAINT "_pages_v_blocks_film_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_creds_strip_items" ADD CONSTRAINT "_pages_v_blocks_creds_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_creds_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_creds_strip" ADD CONSTRAINT "_pages_v_blocks_creds_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_course_cards" ADD CONSTRAINT "_pages_v_blocks_course_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_free_sos" ADD CONSTRAINT "_pages_v_blocks_free_sos_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_free_sos" ADD CONSTRAINT "_pages_v_blocks_free_sos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_press_logos_logos" ADD CONSTRAINT "_pages_v_blocks_press_logos_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_press_logos_logos" ADD CONSTRAINT "_pages_v_blocks_press_logos_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_press_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_press_logos" ADD CONSTRAINT "_pages_v_blocks_press_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_welcome_checklist" ADD CONSTRAINT "_pages_v_blocks_welcome_checklist_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_welcome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_welcome_side_paragraphs" ADD CONSTRAINT "_pages_v_blocks_welcome_side_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_welcome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_welcome" ADD CONSTRAINT "_pages_v_blocks_welcome_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_usps_cards" ADD CONSTRAINT "_pages_v_blocks_usps_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_usps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_usps" ADD CONSTRAINT "_pages_v_blocks_usps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_states_cards" ADD CONSTRAINT "_pages_v_blocks_states_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_states_cards" ADD CONSTRAINT "_pages_v_blocks_states_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_states" ADD CONSTRAINT "_pages_v_blocks_states_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_services_rows" ADD CONSTRAINT "_pages_v_blocks_services_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_services" ADD CONSTRAINT "_pages_v_blocks_services_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_services" ADD CONSTRAINT "_pages_v_blocks_services_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about_paragraphs" ADD CONSTRAINT "_pages_v_blocks_about_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about_stats" ADD CONSTRAINT "_pages_v_blocks_about_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about" ADD CONSTRAINT "_pages_v_blocks_about_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about" ADD CONSTRAINT "_pages_v_blocks_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_how_it_works_steps" ADD CONSTRAINT "_pages_v_blocks_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_how_it_works" ADD CONSTRAINT "_pages_v_blocks_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials" ADD CONSTRAINT "_pages_v_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_knowledge" ADD CONSTRAINT "_pages_v_blocks_knowledge_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_banner" ADD CONSTRAINT "_pages_v_blocks_cta_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_film_hero_tags_order_idx" ON "pages_blocks_film_hero_tags" USING btree ("_order");
  CREATE INDEX "pages_blocks_film_hero_tags_parent_id_idx" ON "pages_blocks_film_hero_tags" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_film_hero_ctas_order_idx" ON "pages_blocks_film_hero_ctas" USING btree ("_order");
  CREATE INDEX "pages_blocks_film_hero_ctas_parent_id_idx" ON "pages_blocks_film_hero_ctas" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_film_hero_order_idx" ON "pages_blocks_film_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_film_hero_parent_id_idx" ON "pages_blocks_film_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_film_hero_path_idx" ON "pages_blocks_film_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_creds_strip_items_order_idx" ON "pages_blocks_creds_strip_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_creds_strip_items_parent_id_idx" ON "pages_blocks_creds_strip_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_creds_strip_order_idx" ON "pages_blocks_creds_strip" USING btree ("_order");
  CREATE INDEX "pages_blocks_creds_strip_parent_id_idx" ON "pages_blocks_creds_strip" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_creds_strip_path_idx" ON "pages_blocks_creds_strip" USING btree ("_path");
  CREATE INDEX "pages_blocks_course_cards_order_idx" ON "pages_blocks_course_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_course_cards_parent_id_idx" ON "pages_blocks_course_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_course_cards_path_idx" ON "pages_blocks_course_cards" USING btree ("_path");
  CREATE INDEX "pages_blocks_free_sos_order_idx" ON "pages_blocks_free_sos" USING btree ("_order");
  CREATE INDEX "pages_blocks_free_sos_parent_id_idx" ON "pages_blocks_free_sos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_free_sos_path_idx" ON "pages_blocks_free_sos" USING btree ("_path");
  CREATE INDEX "pages_blocks_free_sos_background_image_idx" ON "pages_blocks_free_sos" USING btree ("background_image_id");
  CREATE INDEX "pages_blocks_press_logos_logos_order_idx" ON "pages_blocks_press_logos_logos" USING btree ("_order");
  CREATE INDEX "pages_blocks_press_logos_logos_parent_id_idx" ON "pages_blocks_press_logos_logos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_press_logos_logos_image_idx" ON "pages_blocks_press_logos_logos" USING btree ("image_id");
  CREATE INDEX "pages_blocks_press_logos_order_idx" ON "pages_blocks_press_logos" USING btree ("_order");
  CREATE INDEX "pages_blocks_press_logos_parent_id_idx" ON "pages_blocks_press_logos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_press_logos_path_idx" ON "pages_blocks_press_logos" USING btree ("_path");
  CREATE INDEX "pages_blocks_welcome_checklist_order_idx" ON "pages_blocks_welcome_checklist" USING btree ("_order");
  CREATE INDEX "pages_blocks_welcome_checklist_parent_id_idx" ON "pages_blocks_welcome_checklist" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_welcome_side_paragraphs_order_idx" ON "pages_blocks_welcome_side_paragraphs" USING btree ("_order");
  CREATE INDEX "pages_blocks_welcome_side_paragraphs_parent_id_idx" ON "pages_blocks_welcome_side_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_welcome_order_idx" ON "pages_blocks_welcome" USING btree ("_order");
  CREATE INDEX "pages_blocks_welcome_parent_id_idx" ON "pages_blocks_welcome" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_welcome_path_idx" ON "pages_blocks_welcome" USING btree ("_path");
  CREATE INDEX "pages_blocks_usps_cards_order_idx" ON "pages_blocks_usps_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_usps_cards_parent_id_idx" ON "pages_blocks_usps_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_usps_order_idx" ON "pages_blocks_usps" USING btree ("_order");
  CREATE INDEX "pages_blocks_usps_parent_id_idx" ON "pages_blocks_usps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_usps_path_idx" ON "pages_blocks_usps" USING btree ("_path");
  CREATE INDEX "pages_blocks_states_cards_order_idx" ON "pages_blocks_states_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_states_cards_parent_id_idx" ON "pages_blocks_states_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_states_cards_image_idx" ON "pages_blocks_states_cards" USING btree ("image_id");
  CREATE INDEX "pages_blocks_states_order_idx" ON "pages_blocks_states" USING btree ("_order");
  CREATE INDEX "pages_blocks_states_parent_id_idx" ON "pages_blocks_states" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_states_path_idx" ON "pages_blocks_states" USING btree ("_path");
  CREATE INDEX "pages_blocks_services_rows_order_idx" ON "pages_blocks_services_rows" USING btree ("_order");
  CREATE INDEX "pages_blocks_services_rows_parent_id_idx" ON "pages_blocks_services_rows" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_services_order_idx" ON "pages_blocks_services" USING btree ("_order");
  CREATE INDEX "pages_blocks_services_parent_id_idx" ON "pages_blocks_services" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_services_path_idx" ON "pages_blocks_services" USING btree ("_path");
  CREATE INDEX "pages_blocks_services_image_idx" ON "pages_blocks_services" USING btree ("image_id");
  CREATE INDEX "pages_blocks_about_paragraphs_order_idx" ON "pages_blocks_about_paragraphs" USING btree ("_order");
  CREATE INDEX "pages_blocks_about_paragraphs_parent_id_idx" ON "pages_blocks_about_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_about_stats_order_idx" ON "pages_blocks_about_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_about_stats_parent_id_idx" ON "pages_blocks_about_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_about_order_idx" ON "pages_blocks_about" USING btree ("_order");
  CREATE INDEX "pages_blocks_about_parent_id_idx" ON "pages_blocks_about" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_about_path_idx" ON "pages_blocks_about" USING btree ("_path");
  CREATE INDEX "pages_blocks_about_photo_idx" ON "pages_blocks_about" USING btree ("photo_id");
  CREATE INDEX "pages_blocks_how_it_works_steps_order_idx" ON "pages_blocks_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_how_it_works_steps_parent_id_idx" ON "pages_blocks_how_it_works_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_how_it_works_order_idx" ON "pages_blocks_how_it_works" USING btree ("_order");
  CREATE INDEX "pages_blocks_how_it_works_parent_id_idx" ON "pages_blocks_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_how_it_works_path_idx" ON "pages_blocks_how_it_works" USING btree ("_path");
  CREATE INDEX "pages_blocks_testimonials_order_idx" ON "pages_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_parent_id_idx" ON "pages_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_path_idx" ON "pages_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "pages_blocks_knowledge_order_idx" ON "pages_blocks_knowledge" USING btree ("_order");
  CREATE INDEX "pages_blocks_knowledge_parent_id_idx" ON "pages_blocks_knowledge" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_knowledge_path_idx" ON "pages_blocks_knowledge" USING btree ("_path");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_cta_banner_order_idx" ON "pages_blocks_cta_banner" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_banner_parent_id_idx" ON "pages_blocks_cta_banner" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_banner_path_idx" ON "pages_blocks_cta_banner" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_film_hero_tags_order_idx" ON "_pages_v_blocks_film_hero_tags" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_film_hero_tags_parent_id_idx" ON "_pages_v_blocks_film_hero_tags" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_film_hero_ctas_order_idx" ON "_pages_v_blocks_film_hero_ctas" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_film_hero_ctas_parent_id_idx" ON "_pages_v_blocks_film_hero_ctas" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_film_hero_order_idx" ON "_pages_v_blocks_film_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_film_hero_parent_id_idx" ON "_pages_v_blocks_film_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_film_hero_path_idx" ON "_pages_v_blocks_film_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_creds_strip_items_order_idx" ON "_pages_v_blocks_creds_strip_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_creds_strip_items_parent_id_idx" ON "_pages_v_blocks_creds_strip_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_creds_strip_order_idx" ON "_pages_v_blocks_creds_strip" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_creds_strip_parent_id_idx" ON "_pages_v_blocks_creds_strip" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_creds_strip_path_idx" ON "_pages_v_blocks_creds_strip" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_course_cards_order_idx" ON "_pages_v_blocks_course_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_course_cards_parent_id_idx" ON "_pages_v_blocks_course_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_course_cards_path_idx" ON "_pages_v_blocks_course_cards" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_free_sos_order_idx" ON "_pages_v_blocks_free_sos" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_free_sos_parent_id_idx" ON "_pages_v_blocks_free_sos" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_free_sos_path_idx" ON "_pages_v_blocks_free_sos" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_free_sos_background_image_idx" ON "_pages_v_blocks_free_sos" USING btree ("background_image_id");
  CREATE INDEX "_pages_v_blocks_press_logos_logos_order_idx" ON "_pages_v_blocks_press_logos_logos" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_press_logos_logos_parent_id_idx" ON "_pages_v_blocks_press_logos_logos" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_press_logos_logos_image_idx" ON "_pages_v_blocks_press_logos_logos" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_press_logos_order_idx" ON "_pages_v_blocks_press_logos" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_press_logos_parent_id_idx" ON "_pages_v_blocks_press_logos" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_press_logos_path_idx" ON "_pages_v_blocks_press_logos" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_welcome_checklist_order_idx" ON "_pages_v_blocks_welcome_checklist" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_welcome_checklist_parent_id_idx" ON "_pages_v_blocks_welcome_checklist" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_welcome_side_paragraphs_order_idx" ON "_pages_v_blocks_welcome_side_paragraphs" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_welcome_side_paragraphs_parent_id_idx" ON "_pages_v_blocks_welcome_side_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_welcome_order_idx" ON "_pages_v_blocks_welcome" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_welcome_parent_id_idx" ON "_pages_v_blocks_welcome" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_welcome_path_idx" ON "_pages_v_blocks_welcome" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_usps_cards_order_idx" ON "_pages_v_blocks_usps_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_usps_cards_parent_id_idx" ON "_pages_v_blocks_usps_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_usps_order_idx" ON "_pages_v_blocks_usps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_usps_parent_id_idx" ON "_pages_v_blocks_usps" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_usps_path_idx" ON "_pages_v_blocks_usps" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_states_cards_order_idx" ON "_pages_v_blocks_states_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_states_cards_parent_id_idx" ON "_pages_v_blocks_states_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_states_cards_image_idx" ON "_pages_v_blocks_states_cards" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_states_order_idx" ON "_pages_v_blocks_states" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_states_parent_id_idx" ON "_pages_v_blocks_states" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_states_path_idx" ON "_pages_v_blocks_states" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_services_rows_order_idx" ON "_pages_v_blocks_services_rows" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_services_rows_parent_id_idx" ON "_pages_v_blocks_services_rows" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_services_order_idx" ON "_pages_v_blocks_services" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_services_parent_id_idx" ON "_pages_v_blocks_services" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_services_path_idx" ON "_pages_v_blocks_services" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_services_image_idx" ON "_pages_v_blocks_services" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_about_paragraphs_order_idx" ON "_pages_v_blocks_about_paragraphs" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_about_paragraphs_parent_id_idx" ON "_pages_v_blocks_about_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_about_stats_order_idx" ON "_pages_v_blocks_about_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_about_stats_parent_id_idx" ON "_pages_v_blocks_about_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_about_order_idx" ON "_pages_v_blocks_about" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_about_parent_id_idx" ON "_pages_v_blocks_about" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_about_path_idx" ON "_pages_v_blocks_about" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_about_photo_idx" ON "_pages_v_blocks_about" USING btree ("photo_id");
  CREATE INDEX "_pages_v_blocks_how_it_works_steps_order_idx" ON "_pages_v_blocks_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_how_it_works_steps_parent_id_idx" ON "_pages_v_blocks_how_it_works_steps" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_how_it_works_order_idx" ON "_pages_v_blocks_how_it_works" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_how_it_works_parent_id_idx" ON "_pages_v_blocks_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_how_it_works_path_idx" ON "_pages_v_blocks_how_it_works" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_testimonials_order_idx" ON "_pages_v_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_parent_id_idx" ON "_pages_v_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_path_idx" ON "_pages_v_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_knowledge_order_idx" ON "_pages_v_blocks_knowledge" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_knowledge_parent_id_idx" ON "_pages_v_blocks_knowledge" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_knowledge_path_idx" ON "_pages_v_blocks_knowledge" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_cta_banner_order_idx" ON "_pages_v_blocks_cta_banner" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_banner_parent_id_idx" ON "_pages_v_blocks_cta_banner" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_banner_path_idx" ON "_pages_v_blocks_cta_banner" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_film_hero_tags" CASCADE;
  DROP TABLE "pages_blocks_film_hero_ctas" CASCADE;
  DROP TABLE "pages_blocks_film_hero" CASCADE;
  DROP TABLE "pages_blocks_creds_strip_items" CASCADE;
  DROP TABLE "pages_blocks_creds_strip" CASCADE;
  DROP TABLE "pages_blocks_course_cards" CASCADE;
  DROP TABLE "pages_blocks_free_sos" CASCADE;
  DROP TABLE "pages_blocks_press_logos_logos" CASCADE;
  DROP TABLE "pages_blocks_press_logos" CASCADE;
  DROP TABLE "pages_blocks_welcome_checklist" CASCADE;
  DROP TABLE "pages_blocks_welcome_side_paragraphs" CASCADE;
  DROP TABLE "pages_blocks_welcome" CASCADE;
  DROP TABLE "pages_blocks_usps_cards" CASCADE;
  DROP TABLE "pages_blocks_usps" CASCADE;
  DROP TABLE "pages_blocks_states_cards" CASCADE;
  DROP TABLE "pages_blocks_states" CASCADE;
  DROP TABLE "pages_blocks_services_rows" CASCADE;
  DROP TABLE "pages_blocks_services" CASCADE;
  DROP TABLE "pages_blocks_about_paragraphs" CASCADE;
  DROP TABLE "pages_blocks_about_stats" CASCADE;
  DROP TABLE "pages_blocks_about" CASCADE;
  DROP TABLE "pages_blocks_how_it_works_steps" CASCADE;
  DROP TABLE "pages_blocks_how_it_works" CASCADE;
  DROP TABLE "pages_blocks_testimonials" CASCADE;
  DROP TABLE "pages_blocks_knowledge" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_cta_banner" CASCADE;
  DROP TABLE "_pages_v_blocks_film_hero_tags" CASCADE;
  DROP TABLE "_pages_v_blocks_film_hero_ctas" CASCADE;
  DROP TABLE "_pages_v_blocks_film_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_creds_strip_items" CASCADE;
  DROP TABLE "_pages_v_blocks_creds_strip" CASCADE;
  DROP TABLE "_pages_v_blocks_course_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_free_sos" CASCADE;
  DROP TABLE "_pages_v_blocks_press_logos_logos" CASCADE;
  DROP TABLE "_pages_v_blocks_press_logos" CASCADE;
  DROP TABLE "_pages_v_blocks_welcome_checklist" CASCADE;
  DROP TABLE "_pages_v_blocks_welcome_side_paragraphs" CASCADE;
  DROP TABLE "_pages_v_blocks_welcome" CASCADE;
  DROP TABLE "_pages_v_blocks_usps_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_usps" CASCADE;
  DROP TABLE "_pages_v_blocks_states_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_states" CASCADE;
  DROP TABLE "_pages_v_blocks_services_rows" CASCADE;
  DROP TABLE "_pages_v_blocks_services" CASCADE;
  DROP TABLE "_pages_v_blocks_about_paragraphs" CASCADE;
  DROP TABLE "_pages_v_blocks_about_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_about" CASCADE;
  DROP TABLE "_pages_v_blocks_how_it_works_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_how_it_works" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonials" CASCADE;
  DROP TABLE "_pages_v_blocks_knowledge" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_banner" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_creds_strip_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_course_cards_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_free_sos_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_press_logos_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_welcome_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_usps_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_states_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_services_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_about_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_how_it_works_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_testimonials_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_knowledge_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_faq_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_rich_text_section_settings_hatter";
  DROP TYPE "public"."enum_pages_blocks_cta_banner_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_creds_strip_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_course_cards_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_free_sos_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_press_logos_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_welcome_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_usps_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_states_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_services_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_about_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_how_it_works_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_knowledge_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_faq_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_section_settings_hatter";
  DROP TYPE "public"."enum__pages_v_blocks_cta_banner_section_settings_hatter";`)
}
