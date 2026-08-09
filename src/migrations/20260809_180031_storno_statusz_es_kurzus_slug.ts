import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_storno_status" AS ENUM('none', 'pending', 'storned', 'failed');
  CREATE TYPE "public"."enum_orders_corrective_invoice_status" AS ENUM('none', 'pending', 'issued', 'failed');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'storno-issue';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'corrective-invoice-issue';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'storno-issue';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'corrective-invoice-issue';
  ALTER TABLE "products" ADD COLUMN "display_title" varchar;
  ALTER TABLE "products" ADD COLUMN "slug" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_display_title" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_slug" varchar;
  ALTER TABLE "orders" ADD COLUMN "storno_status" "enum_orders_storno_status" DEFAULT 'none';
  ALTER TABLE "orders" ADD COLUMN "storno_number" varchar;
  ALTER TABLE "orders" ADD COLUMN "storno_attempts" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "storno_last_error" varchar;
  ALTER TABLE "orders" ADD COLUMN "corrective_invoice_status" "enum_orders_corrective_invoice_status" DEFAULT 'none';
  ALTER TABLE "orders" ADD COLUMN "corrective_invoice_number" varchar;
  ALTER TABLE "orders" ADD COLUMN "corrective_invoice_seq" numeric DEFAULT 0;
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'webhook-retry', 'order-poll', 'invoice-issue');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'webhook-retry', 'order-poll', 'invoice-issue');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "products_slug_idx";
  DROP INDEX "_products_v_version_version_slug_idx";
  ALTER TABLE "products" DROP COLUMN "display_title";
  ALTER TABLE "products" DROP COLUMN "slug";
  ALTER TABLE "_products_v" DROP COLUMN "version_display_title";
  ALTER TABLE "_products_v" DROP COLUMN "version_slug";
  ALTER TABLE "orders" DROP COLUMN "storno_status";
  ALTER TABLE "orders" DROP COLUMN "storno_number";
  ALTER TABLE "orders" DROP COLUMN "storno_attempts";
  ALTER TABLE "orders" DROP COLUMN "storno_last_error";
  ALTER TABLE "orders" DROP COLUMN "corrective_invoice_status";
  ALTER TABLE "orders" DROP COLUMN "corrective_invoice_number";
  ALTER TABLE "orders" DROP COLUMN "corrective_invoice_seq";
  DROP TYPE "public"."enum_orders_storno_status";
  DROP TYPE "public"."enum_orders_corrective_invoice_status";`)
}
