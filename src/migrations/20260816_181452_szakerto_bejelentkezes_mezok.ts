import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_team_members_members" ADD COLUMN "call_label" varchar;
  ALTER TABLE "pages_blocks_team_members_members" ADD COLUMN "availability" varchar;
  ALTER TABLE "pages_blocks_team_members" ADD COLUMN "booking_link_felirat" varchar;
  ALTER TABLE "pages_blocks_team_members" ADD COLUMN "booking_link_url" varchar;
  ALTER TABLE "pages_blocks_team_members" ADD COLUMN "booking_link_uj_ablakban" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_team_members_members" ADD COLUMN "call_label" varchar;
  ALTER TABLE "_pages_v_blocks_team_members_members" ADD COLUMN "availability" varchar;
  ALTER TABLE "_pages_v_blocks_team_members" ADD COLUMN "booking_link_felirat" varchar;
  ALTER TABLE "_pages_v_blocks_team_members" ADD COLUMN "booking_link_url" varchar;
  ALTER TABLE "_pages_v_blocks_team_members" ADD COLUMN "booking_link_uj_ablakban" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_team_members_members" DROP COLUMN "call_label";
  ALTER TABLE "pages_blocks_team_members_members" DROP COLUMN "availability";
  ALTER TABLE "pages_blocks_team_members" DROP COLUMN "booking_link_felirat";
  ALTER TABLE "pages_blocks_team_members" DROP COLUMN "booking_link_url";
  ALTER TABLE "pages_blocks_team_members" DROP COLUMN "booking_link_uj_ablakban";
  ALTER TABLE "_pages_v_blocks_team_members_members" DROP COLUMN "call_label";
  ALTER TABLE "_pages_v_blocks_team_members_members" DROP COLUMN "availability";
  ALTER TABLE "_pages_v_blocks_team_members" DROP COLUMN "booking_link_felirat";
  ALTER TABLE "_pages_v_blocks_team_members" DROP COLUMN "booking_link_url";
  ALTER TABLE "_pages_v_blocks_team_members" DROP COLUMN "booking_link_uj_ablakban";`)
}
