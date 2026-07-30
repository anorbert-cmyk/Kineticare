import * as migration_20260729_231123_initial_schema from './20260729_231123_initial_schema';
import * as migration_20260730_010003_products_status_enum from './20260730_010003_products_status_enum';
import * as migration_20260730_080404_sync_schema_code from './20260730_080404_sync_schema_code';

export const migrations = [
  {
    up: migration_20260729_231123_initial_schema.up,
    down: migration_20260729_231123_initial_schema.down,
    name: '20260729_231123_initial_schema',
  },
  {
    up: migration_20260730_010003_products_status_enum.up,
    down: migration_20260730_010003_products_status_enum.down,
    name: '20260730_010003_products_status_enum',
  },
  {
    up: migration_20260730_080404_sync_schema_code.up,
    down: migration_20260730_080404_sync_schema_code.down,
    name: '20260730_080404_sync_schema_code'
  },
];
