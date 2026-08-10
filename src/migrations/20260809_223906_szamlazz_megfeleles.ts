import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "invoice_attempts" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "invoice_last_error" varchar;
  ALTER TABLE "orders" ADD COLUMN "invoice_completion_date" varchar;
  ALTER TABLE "orders" ADD COLUMN "corrective_invoice_attempts" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "corrective_invoice_last_error" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN "invoice_attempts";
  ALTER TABLE "orders" DROP COLUMN "invoice_last_error";
  ALTER TABLE "orders" DROP COLUMN "invoice_completion_date";
  ALTER TABLE "orders" DROP COLUMN "corrective_invoice_attempts";
  ALTER TABLE "orders" DROP COLUMN "corrective_invoice_last_error";`)
}
