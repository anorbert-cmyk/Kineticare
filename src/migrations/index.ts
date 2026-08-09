import * as migration_20260729_231123_initial_schema from './20260729_231123_initial_schema';
import * as migration_20260730_010003_products_status_enum from './20260730_010003_products_status_enum';
import * as migration_20260730_080404_sync_schema_code from './20260730_080404_sync_schema_code';
import * as migration_20260808_123444_tartalomkezeles_admin_velemenyek from './20260808_123444_tartalomkezeles_admin_velemenyek';
import * as migration_20260808_150710_szekcio_rendszer_blokkok from './20260808_150710_szekcio_rendszer_blokkok';
import * as migration_20260809_123608_kurzus_seo_mezok from './20260809_123608_kurzus_seo_mezok';
import * as migration_20260809_140731_kurzus_haladas_es_celkozonseg from './20260809_140731_kurzus_haladas_es_celkozonseg';

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
    name: '20260730_080404_sync_schema_code',
  },
  {
    up: migration_20260808_123444_tartalomkezeles_admin_velemenyek.up,
    down: migration_20260808_123444_tartalomkezeles_admin_velemenyek.down,
    name: '20260808_123444_tartalomkezeles_admin_velemenyek',
  },
  {
    up: migration_20260808_150710_szekcio_rendszer_blokkok.up,
    down: migration_20260808_150710_szekcio_rendszer_blokkok.down,
    name: '20260808_150710_szekcio_rendszer_blokkok',
  },
  {
    up: migration_20260809_123608_kurzus_seo_mezok.up,
    down: migration_20260809_123608_kurzus_seo_mezok.down,
    name: '20260809_123608_kurzus_seo_mezok',
  },
  {
    up: migration_20260809_140731_kurzus_haladas_es_celkozonseg.up,
    down: migration_20260809_140731_kurzus_haladas_es_celkozonseg.down,
    name: '20260809_140731_kurzus_haladas_es_celkozonseg'
  },
];
