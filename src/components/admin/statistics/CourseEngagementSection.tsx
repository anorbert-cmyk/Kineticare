import type { CSSProperties } from 'react'

import { AUDIENCE_LABELS } from '../../../lib/course-audience'
import type { CourseEngagementReport } from '../../../lib/statistics/engagement'
import {
  captionStyle,
  noticeStyle,
  numericStyle,
  rowHeaderStyle,
  sectionStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thNumericStyle,
  thStyle,
} from './styles'

/**
 * „Kurzus-hatás" szekció — eladás × haladás kurzusonként: hányan férnek
 * hozzá, hányan kezdték el, fejezték be, és hányan vették meg úgy, hogy el
 * sem kezdték. A megrendelői igény: „arra is lehessen szűrni, hogy ki az,
 * mennyien kezdték el, fejezték be, aki megvette, de el sem kezdte".
 *
 * ═══ MIÉRT NINCS ITT NÉVSOR ═══
 * A „ki az konkrétan" kérdés válasza a kurzus szerkesztőlapján él, a
 * meglévő Kurzus-haladás panelben (név, állapot-szűrő, keresés, CSV) — egy
 * adat egy helyen él (docs/informacios-architektura.md), és a soronkénti
 * link odavisz. A cselekvő, célját megnevező linkszöveg a WCAG 2.2
 * SC 2.4.4 Link Purpose ajánlása:
 * https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html
 *
 * ═══ HANGSÚLY ═══
 * A „Nem kezdte el" érték nullánál nagyobb esetben vastag és a márka
 * danger tokenjét kapja (--kc-as-danger = #b3261e, fehér felületen számolt
 * 6,54:1 kontraszt — custom.scss jegyzőkönyv; Payload-tartalékkal): ők azok,
 * akiket a munkatársak utolérnek. A jelentést az oszlopfejléc szövege
 * hordozza, a szín csak kiegészítő jelzés (WCAG 2.2 SC 1.4.1 Use of Color:
 * https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
 */

/* A 8 oszlop + linkszöveg miatt szélesebb minimum, mint a bevétel-tábláké:
   keskeny viewporton a wrap görget, nem a lap (WCAG 1.4.10 / G225). */
const engagementTableStyle: CSSProperties = {
  ...tableStyle,
  minWidth: 'calc(832 * var(--kc-as-px, 1px))',
}

const emphasizedCountStyle: CSSProperties = {
  color: 'var(--kc-as-danger, var(--theme-error-500))',
  fontWeight: 700,
}

export function CourseEngagementSection({
  engagement,
}: {
  engagement: CourseEngagementReport | null | undefined
}) {
  return (
    <section style={sectionStyle}>
      <h2>Kurzus-hatás</h2>
      {engagement === null || engagement === undefined ? (
        <p style={noticeStyle}>
          A kurzus-hatás adatai most nem tölthetők be. A bevételi számok ettől függetlenül
          érvényesek. Próbáld újra később.
        </p>
      ) : engagement.courses.length === 0 ? (
        <p style={noticeStyle}>Még nincs kurzus, amiről haladást lehetne mutatni.</p>
      ) : (
        <>
          {engagement.truncated ? (
            <p
              style={{
                ...noticeStyle,
                marginBottom: 'var(--kc-as-space-4, calc(var(--base) * 1))',
              }}
            >
              A kurzusoknak a megjeleníthetőnél több adata van, ezért a számok alsó becslések. A
              pontos, hallgatónkénti adat a kurzus lapján érhető el.
            </p>
          ) : null}
          {/* A hibára kimaradt kurzusokat KIMONDJUK. Egy csendben eltűnt sor
              rosszabb, mint egy hiányt jelző mondat: a munkatárs azt hinné,
              hogy az a kurzus nem is létezik. A részleteket (melyik kurzus,
              milyen hiba) a szerveroldali napló őrzi. */}
          {engagement.skipped > 0 ? (
            <p
              style={{
                ...noticeStyle,
                marginBottom: 'var(--kc-as-space-4, calc(var(--base) * 1))',
              }}
            >
              {engagement.skipped === 1
                ? 'Egy kurzus adata technikai hiba miatt kimaradt ebből a táblából. A többi sor teljes.'
                : `${engagement.skipped.toLocaleString('hu-HU')} kurzus adata technikai hiba miatt kimaradt ebből a táblából. A többi sor teljes.`}
            </p>
          ) : null}
          {/* role="region" + aria-labelledby + tabIndex: a keskeny viewporton
              görgethető táblát billentyűzetről is lehessen görgetni (WCAG
              2.1.1; axe: scrollable-region-focusable; a minta Adrian Roselli
              Under-Engineered Responsive Tables cikkéből —
              https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html;
              a fókuszgyűrűt a custom.scss adja). */}
          <div
            style={tableWrapStyle}
            role="region"
            aria-labelledby="kc-stat-kurzushatas-cim"
            tabIndex={0}
          >
            <table style={engagementTableStyle}>
              {/* Oszlopnevek: SZÓRÓL SZÓRA a kurzuslap Kurzus-haladás
                  paneljének címkéi („Beiratkozott", „Nem kezdte el" —
                  CourseProgressPanel StatCard-sor és statusLabel), mert a
                  kettő ugyanazt a közös összesítőt mutatja: egy fogalom egy
                  szó (WCAG 2.2 SC 3.2.4 Consistent Identification:
                  https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html;
                  NN/g 4. heurisztika, Consistency and Standards:
                  https://www.nngroup.com/articles/consistency-and-standards/).
                  A 2026-08-20-i audit előtt itt „Hozzáfér" és „El sem
                  kezdte" állt. */}
              <caption style={captionStyle} id="kc-stat-kurzushatas-cim">
                Eladás és haladás kurzusonként: beiratkozottak, elkezdők, befejezők
              </caption>
              <thead>
                <tr>
                  <th style={thStyle} scope="col">
                    Kurzus
                  </th>
                  <th style={thStyle} scope="col">
                    Ág
                  </th>
                  <th style={thNumericStyle} scope="col">
                    Beiratkozott
                  </th>
                  <th style={thNumericStyle} scope="col">
                    Elkezdte
                  </th>
                  <th style={thNumericStyle} scope="col">
                    Befejezte
                  </th>
                  <th style={thNumericStyle} scope="col">
                    Nem kezdte el
                  </th>
                  <th style={thNumericStyle} scope="col">
                    Átlagos haladás
                  </th>
                  <th style={thStyle} scope="col">
                    Névsor
                  </th>
                </tr>
              </thead>
              <tbody>
                {engagement.courses.map((course) => (
                  <tr key={course.productId}>
                    <th style={rowHeaderStyle} scope="row">
                      {course.title}
                    </th>
                    <td style={tdStyle}>{AUDIENCE_LABELS[course.audience]}</td>
                    <td style={numericStyle}>{course.enrolled.toLocaleString('hu-HU')}</td>
                    <td style={numericStyle}>{course.started.toLocaleString('hu-HU')}</td>
                    <td style={numericStyle}>{course.completed.toLocaleString('hu-HU')}</td>
                    <td style={numericStyle}>
                      <span style={course.notStarted > 0 ? emphasizedCountStyle : undefined}>
                        {course.notStarted.toLocaleString('hu-HU')}
                      </span>
                    </td>
                    <td style={numericStyle}>{`${String(course.averagePercent)}%`}</td>
                    <td style={tdStyle}>
                      {/* A link színét a custom.scss `.kc-adminstat a` szabálya
                          adja (ink + aláhúzás, hover accent-deep — a landing
                          link-nyelve); a márka-CSS nélkül a Payload saját
                          link-stílusa érvényesül. */}
                      <a href={`/admin/collections/products/${String(course.productId)}`}>
                        Névsor és szűrés a kurzus lapján
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            style={{
              ...noticeStyle,
              marginTop: 'var(--kc-as-space-3, calc(var(--base) * 0.75))',
            }}
          >
            A név szerinti lista a kurzus szerkesztőlapján, a Tananyag alatti Kurzus-haladás
            panelben van: ott állapot szerint szűrhetsz (mind, nem kezdte el, folyamatban,
            befejezte), név vagy e-mail alapján kereshetsz, és látod a leckénkénti lemorzsolódást
            is. A táblázat soraiból egy kattintással odajutsz.
          </p>
        </>
      )}
    </section>
  )
}
