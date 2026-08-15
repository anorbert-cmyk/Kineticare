'use client'

import { useRowLabel } from '@payloadcms/ui'
import type { JSX } from 'react'

import {
  lessonRowLabel,
  moduleRowLabel,
  type LessonRowData,
  type ModuleRowData,
} from './curriculum-row-label'

/**
 * A tananyag összecsukott sorainak FELIRATA (Payload `RowLabel`).
 *
 * A komponensek szándékosan üresek a logikából: az egész feliratképzés a tiszta,
 * tesztelt `./curriculum-row-label.ts` modulban él (a repóban nincs DOM-alapú
 * komponensteszt-készlet, a határesetek viszont fontosak). Itt csak a Payload
 * sor-kontextusát olvassuk ki és adjuk tovább.
 */

export function ModuleRowLabel(): JSX.Element {
  const { data, rowNumber } = useRowLabel<ModuleRowData>()
  return <span>{moduleRowLabel(data, (rowNumber ?? 0) + 1)}</span>
}

export function LessonRowLabel(): JSX.Element {
  const { data, rowNumber } = useRowLabel<LessonRowData>()
  return <span>{lessonRowLabel(data, (rowNumber ?? 0) + 1)}</span>
}
