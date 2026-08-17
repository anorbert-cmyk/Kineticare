import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_appointment" ADD COLUMN "urlap_mutatasa" boolean DEFAULT true;
  ALTER TABLE "_pages_v_blocks_appointment" ADD COLUMN "urlap_mutatasa" boolean DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_appointment" DROP COLUMN "urlap_mutatasa";
  ALTER TABLE "_pages_v_blocks_appointment" DROP COLUMN "urlap_mutatasa";`)
}
