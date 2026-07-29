import * as migration_20260729_231123_initial_schema from './20260729_231123_initial_schema'

export const migrations = [
  {
    up: migration_20260729_231123_initial_schema.up,
    down: migration_20260729_231123_initial_schema.down,
    name: '20260729_231123_initial_schema',
  },
]
