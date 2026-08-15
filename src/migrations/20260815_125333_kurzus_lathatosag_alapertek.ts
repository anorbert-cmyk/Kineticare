import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'draft';
  ALTER TABLE "_products_v" ALTER COLUMN "version_status" SET DEFAULT 'draft';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "_products_v" ALTER COLUMN "version_status" DROP DEFAULT;`)
}
