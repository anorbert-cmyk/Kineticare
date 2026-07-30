import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_product_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum__products_v_version_product_status" AS ENUM('draft', 'published', 'archived');
  ALTER TABLE "products" ALTER COLUMN "status" SET DATA TYPE "public"."enum_products_product_status" USING "status"::text::"public"."enum_products_product_status";
  ALTER TABLE "_products_v" ALTER COLUMN "version_status" SET DATA TYPE "public"."enum__products_v_version_product_status" USING "version_status"::text::"public"."enum__products_v_version_product_status";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ALTER COLUMN "status" SET DATA TYPE "public"."enum_products_status" USING "status"::text::"public"."enum_products_status";
  ALTER TABLE "_products_v" ALTER COLUMN "version_status" SET DATA TYPE "public"."enum__products_v_version_status" USING "version_status"::text::"public"."enum__products_v_version_status";
  DROP TYPE "public"."enum_products_product_status";
  DROP TYPE "public"."enum__products_v_version_product_status";`)
}
