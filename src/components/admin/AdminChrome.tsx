import type { ReactNode } from 'react'
import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'

/**
 * A Payload admin keret (oldalsáv, fejléc) a saját nézetek körül.
 * A custom view magától nem kapja meg a sablont.
 */
export function AdminChrome({
  props,
  children,
}: {
  props: AdminViewServerProps
  children: ReactNode
}) {
  const { initPageResult, params, searchParams } = props
  return (
    <DefaultTemplate
      i18n={props.i18n}
      locale={props.locale ?? initPageResult.locale}
      params={params}
      payload={props.payload}
      permissions={props.permissions ?? initPageResult.permissions}
      searchParams={searchParams}
      user={props.user ?? initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      {children}
    </DefaultTemplate>
  )
}
