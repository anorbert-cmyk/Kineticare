import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import type { ReactNode } from 'react'

import '@payloadcms/next/css'
/* Márka-réteg a Statisztika nézethez — a Payload css UTÁN importálva, hogy
   döntetlennél a scope-olt márka-szabály nyerjen (a Payload 3 dokumentált
   custom-CSS mintája: https://payloadcms.com/docs/admin/customizing-css).
   Minden szabálya a .kc-adminstat scope alatt él, az admin többi részét
   nem érinti — az indoklás és a kontraszt-jegyzőkönyv a fájl fejkommentjében. */
import './custom.scss'

import { importMap } from './admin/importMap'

type Args = {
  children: ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
