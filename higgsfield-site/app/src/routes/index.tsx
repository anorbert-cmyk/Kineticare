import { PersonArmsSpreadIcon } from "@phosphor-icons/react/ssr";
import { createFileRoute } from "@tanstack/react-router";

import { ScrollScrub } from "@/components/scroll-scrub/scroll-scrub";
import { scrollScrubScenes, scrollScrubTheme } from "@/scroll-scrub-scenes";

export const Route = createFileRoute("/")({
  component: Index,
});

const welcomeBullets = [
  "Az ujjad vagy a csuklód már a nap közepén görcsöl, és esélyed sincs pihentetni",
  "Minden mozdulatnál attól tartasz, csak ne legyen rosszabb",
  "Egyre több kenőcsöt, borogatást és „csodaszert” halmozol fel, de a fájdalom újra és újra jelentkezik.",
];

const usps = [
  {
    title: "A legújabb, tudományosan megalapozott módszereket alkalmazzuk",
    body: "Folyamatosan figyeljük a külföldi és hazai szakmai protokollokat, kutatásokat, és a pácienseinken látott valós tapasztalatokat is ötvözzük.",
    extra:
      "Így garantáltan naprakész, biztonságos és hatékony módszerekkel dolgozunk, hogy a kezed a lehető leggyorsabban regenerálódhasson.",
  },
  {
    title: "Személyre szabott megoldást kapsz, akár otthon, akár rendelőben",
    body: "Minden programunkban (legyen az online kurzus vagy személyes kezelés) figyelembe vesszük a te szokásaidat, terhelésedet és korlátaidat.",
    extra:
      "Ha nincs időd a rendelőbe járni, otthoni gyakorlóvideók várnak; ha pedig eljössz hozzánk, az igényeidhez és az életviteledhez igazítjuk a kezelési tervet. A lényeg: mindig van olyan megoldásunk, ami neked megfelel, és valódi javulást hoz.",
  },
  {
    title: "Nem rövidtávú tünetkezeléssel, hanem tartós eredménnyel foglalkozunk",
    body: "Nálunk nem áll meg a folyamat a „gyorsan csökkentsük a fájdalmat” résznél. Arra törekszünk, hogy ne is térjen vissza a kínzó fájdalom.",
    extra:
      "Megmutatjuk, hogyan változtass a mozgásmintáidon, és milyen gyakorlatokat érdemes beépítened a hétköznapokba. A cél: egy olyan stabil, teherbíró kéz, ami hosszú távon bírja a strapát, akár munkáról, sportról vagy a hétköznapok terheléséről van szó.",
  },
];

const states = [
  {
    img: "/assets/brand/state-zart.png",
    imgAlt: "Ökölbe szorított kéz, zárt helyzetben",
    title: "Zárt",
    text: "Fájdalom, bizonytalanság, a kéz védekezése. Ismerős, ha hónapok óta szenvedsz.",
  },
  {
    img: "/assets/brand/state-nyilo.png",
    imgAlt: "Félig nyitott kéz, már oldódik a görcs",
    title: "Nyíló",
    text: "A közös munka meghozza az első enyhülést. Minden alkalommal egy mozdulattal több lesz.",
  },
  {
    img: "/assets/brand/state-nyitott.png",
    imgAlt: "Teljesen nyitott, szabadon tartott tenyér",
    title: "Nyitott",
    text: "Újra a saját kezed. Munkázhatsz, sportolhatsz, önfeledten élhetsz.",
  },
];

const services = [
  {
    num: "01",
    title: "Rendelői kezelések",
    body: "Akut sérülések, műtét utáni állapotok és krónikus fájdalmak esetén a mozgásterápia a gyógyulás alappillére. Gyógytornával, manuálterápiával és egy sor kiegészítő terápiával várunk a stúdiónkban.",
    link: {
      label: "Tovább a kezelésekre",
      href: "https://www.kineticare.hu/rendeloi-kezelesek",
      external: false,
    },
  },
  {
    num: "02",
    title: "Otthoni program",
    body: "Ha nem tudsz eljutni kezelésre, vagy egyszerűen csak megpróbálnád előbb magadnak megoldani a kézproblémádat, akkor ezeket neked készítettük. Az átfogó kézrehabilitációs programban bárhol, bármikor végezhető megoldásokat találsz.",
    link: {
      label: "Tovább a programra",
      href: "https://www.kineticare.hu/kezrehab",
      external: false,
    },
  },
  {
    num: "03",
    title: "Szakmai képzések",
    body: "Akkreditált tantermi kézkurzusunkat a ProBody Stúdióval együttműködve hoztuk létre a kéz, a csukló- és könyökízület rehabilitációs lehetőségeiről gyógytornászoknak, orvosoknak, erőnléti és szakági edzőknek.",
    link: {
      label: "Tovább a kéz workshopra",
      href: "https://probodystudio.hu/kez-workshop/",
      external: true,
    },
  },
];

const pressLogos = [
  { src: "/assets/site/press-noklapja.png", alt: "Nők Lapja" },
  { src: "/assets/site/press-karc.png", alt: "Karc FM" },
  { src: "/assets/site/press-hazipatika.png", alt: "Házipatika" },
  { src: "/assets/site/press-kepmas.png", alt: "Képmás magazin" },
  { src: "/assets/site/press-ispor.png", alt: "iSport" },
  {
    src: "/assets/site/press-mgyft.png",
    alt: "Magyar Gyógytornász-Fizioterapeuták Társasága",
  },
];

function Index() {
  return (
    <div className="kc-root">
      <a className="kc-skip-link" href="#tartalom">
        Ugrás a tartalomhoz
      </a>

      <header className="kc-nav">
        <a className="kc-wordmark" href="/" aria-label="KinetiCare kezdőlap">
          KINETI<span>CARE</span>
        </a>
        <a className="kc-nav-cta" href="mailto:info@kineticare.hu">
          Írjon nekünk
        </a>
      </header>

      <main id="tartalom">
        <ScrollScrub scenes={scrollScrubScenes} theme={scrollScrubTheme} />

        <div className="kc-main">
          <section aria-labelledby="udvozles" className="kc-section kc-welcome kc-vh">
            <div className="kc-welcome-head">
              <h2 className="kc-welcome-title kc-rise" id="udvozles">
                Szeretnél megszabadulni a fájdalomtól, de hiába próbáltál ki
                (szinte) mindent?
              </h2>
              <p className="kc-welcome-lead">Tudjuk, milyen, amikor:</p>
            </div>
            <div className="kc-welcome-grid">
              <ul className="kc-checklist">
                {welcomeBullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="kc-welcome-side">
                <p>
                  Ha eleged van abból, hogy már csak félgőzzel bírsz dolgozni
                  vagy sportolni, mert félsz a fájdalomtól, vagy netán a
                  fájdalomcsillapítókig fajult a helyzet, akkor a legjobb helyen
                  jársz.
                </p>
                <p>
                  <strong>
                    Mozgásterápiás módszerekkel tudunk abban segíteni, hogy
                    végre megszűnjön a kézfájdalmad, és újra teljes
                    erőbedobással élhesd a mindennapjaid.
                  </strong>
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="elvarasaink" className="kc-section kc-usps kc-vh">
            <h2 className="kc-about-title" id="elvarasaink">
              Erre számíthatsz velünk
            </h2>
            <div className="kc-usps-list">
              {usps.map((usp, index) => (
                <article className="kc-usp" key={usp.title}>
                  <span className="kc-usp-num">{index + 1}</span>
                  <div>
                    <h3 className="kc-usp-title">{usp.title}</h3>
                    <p className="kc-usp-body">{usp.body}</p>
                    <p className="kc-usp-body">{usp.extra}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="harom-allapot" className="kc-section kc-states kc-vh">
            <h2 className="kc-about-title kc-rise" id="harom-allapot">
              Három állapot, egy folyamat
            </h2>
            <p className="kc-about-p">
              A logónkat a kezed ismeri fel: zárt, nyíló, majd teljesen nyitott.
              A három kép a filmünk kulcskockái, pontosan abban a sorrendben,
              ahogyan a terápia halad.
            </p>
            <div className="kc-states-grid">
              {states.map((state, index) => (
                <figure className="kc-state-card" key={state.title}>
                  <span className="kc-state-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <img
                    alt={state.imgAlt}
                    className="kc-state-img"
                    loading="lazy"
                    src={state.img}
                  />
                  <figcaption>
                    <h3 className="kc-state-title">{state.title}</h3>
                    <p className="kc-state-text">{state.text}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section aria-labelledby="szolgaltatasok" className="kc-services-section">
            <div className="kc-services">
              <div className="kc-services-lead">
                <p className="kc-eyebrow">Szolgáltatásaink</p>
                <h2 className="kc-services-title kc-rise" id="szolgaltatasok">
                  Így tudunk segíteni
                </h2>
                <img
                  alt="Terapeuta kezei mobilizálják a páciens kezét"
                  className="kc-services-media"
                  loading="lazy"
                  src="/assets/brand/services-hands.png"
                />
              </div>
              <div className="kc-services-list">
                {services.map((service) => (
                  <article className="kc-service-row" key={service.num}>
                    <p className="kc-service-num">{service.num}</p>
                    <div>
                      <h3 className="kc-service-h">{service.title}</h3>
                      <p className="kc-service-p">{service.body}</p>
                      <a
                        aria-label={`${service.title}: ${service.link.label}`}
                        className="kc-inline-link"
                        href={service.link.href}
                        {...(service.link.external
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                      >
                        {service.link.label} <span aria-hidden="true">→</span>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="rolunk" className="kc-about">
            <div className="kc-about-grid">
              <div className="kc-about-copy">
                <p className="kc-eyebrow">Rólunk</p>
                <h2 className="kc-about-title" id="rolunk">
                  Kiss Kata és Kocsis Kata vagyunk
                </h2>
                <p className="kc-about-p">
                  <strong>
                    Kiss Kata és Kocsis Kata vagyunk, gyógytornászok,
                    manuálterapeuták és sportrehabilitációs trénerek, és évek
                    óta elsősorban a kéz rehabilitációjával foglalkozunk.
                  </strong>
                </p>
                <p className="kc-about-p">
                  A pácienseink nagy része kéz-, csukló-, könyök- vagy
                  vállfájdalommal érkezik hozzánk, így pontosan tudjuk, milyen
                  makacs probléma tud ez lenni, és hogy mennyire megkeseríti az
                  ember mindennapjait.
                </p>
                <p className="kc-about-p">
                  A legújabb kutatásokat, külföldi guideline-okat és a saját
                  gyakorlati tapasztalatainkat ötvözzük, mindezt a lehető
                  legbiztonságosabb, mégis leggyorsabb felépülés érdekében.
                </p>
                <p className="kc-about-p">
                  Hiszünk abban, hogy a kezed nemcsak egy testrész: mindenhez
                  szükséged van rá. Ezért igyekszünk minden módon segíteni
                  rendbehozni a kezed, megszüntetni a fájdalmat, és elérni, hogy
                  úgy használhasd a kezed, mintha sosem lett volna vele semmi
                  baj.
                </p>
                <div className="kc-about-feature">
                  <span aria-hidden="true" className="kc-about-feature-icon">
                    <PersonArmsSpreadIcon size={26} weight="light" />
                  </span>
                  <div>
                    <p className="kc-about-feature-label">
                      Személyre szabott kezelések
                    </p>
                    <p className="kc-about-feature-note">
                      Minden páciens egyedi, ezért minden terápiát személyre
                      szabunk.
                    </p>
                  </div>
                </div>
              </div>

              <figure className="kc-about-figure">
                <img
                  alt="Kiss Kata és Kocsis Kata, a KinetiCare gyógytornászai"
                  className="kc-about-photo"
                  loading="lazy"
                  src="/assets/site/katak-team.jpg"
                />
              </figure>

              <dl className="kc-about-stats">
                <div className="kc-stat">
                  <dt>év szakmai tapasztalat</dt>
                  <dd>10+</dd>
                </div>
                <div className="kc-stat">
                  <dt>elégedett páciens</dt>
                  <dd>5000+</dd>
                </div>
                <div className="kc-stat">
                  <dt>közös cél: az Ön mozgásszabadsága</dt>
                  <dd>1</dd>
                </div>
              </dl>
            </div>
          </section>

          <section aria-labelledby="velemenyek" className="kc-quotes-section">
            <div className="kc-quotes-head">
              <p className="kc-eyebrow">Vélemények</p>
              <h2 className="kc-quotes-title" id="velemenyek">
                Pácienseink mondták
              </h2>
            </div>
            <div className="kc-quotes">
              <div className="kc-quotes-main">
                <span aria-hidden="true" className="kc-quote-mark">„</span>
                <blockquote>
                  <p className="kc-quote-big">
                    Már az első alkalommal éreztem, hogy jó kezekben vagyok, szó
                    szerint is. Nemcsak a tüneteket enyhítette, hanem segített
                    megérteni a kiváltó okokat is.
                  </p>
                  <span className="kc-attribution">
                    Garami Gábor, zenész, műsorvezető
                  </span>
                </blockquote>
              </div>
              <div className="kc-quotes-side">
                <blockquote className="kc-quote-small">
                  <span aria-hidden="true" className="kc-quote-mini-mark">„</span>
                  <p>
                    Egy 10 éve tartó ganglion problémával, több operáció után
                    jutottam el Katához, mert szikementes segítséget szerettem
                    volna igénybe venni, és nem is dönthettem volna jobban!
                    Nagyon hálás vagyok, hogy szakértelme által jelentős
                    javulást és tünetmentességet értünk el a kezelések során.
                  </p>
                  <span className="kc-attribution">Kállai Dóra, biológus</span>
                </blockquote>
                <blockquote className="kc-quote-small">
                  <span aria-hidden="true" className="kc-quote-mini-mark">„</span>
                  <p>
                    A KINETICARE lányokat ajánlás alapján kerestem meg, ugyanis
                    pár hónapja erős fájdalommal járt a hüvelykujjam és a
                    csuklóm mozgatása. A közös munkának, a világos
                    magyarázatoknak, a szuper feladatoknak és életvezetési
                    tanácsoknak hála, sikerült a gyógyulás!
                  </p>
                  <span className="kc-attribution">
                    Bagdal Szilvia, jógaoktató
                  </span>
                </blockquote>
              </div>
            </div>
          </section>

          <section aria-label="Megjelenéseink" className="kc-press">
            <p className="kc-press-label">Ismerhetsz minket innen</p>
            <div className="kc-press-row">
              {pressLogos.map((logo) => (
                <img alt={logo.alt} key={logo.src} loading="lazy" src={logo.src} />
              ))}
            </div>
          </section>

          <div className="kc-closing-board">
            <section aria-labelledby="sos" className="kc-sos">
              <img
                alt=""
                aria-hidden="true"
                className="kc-sos-art"
                loading="lazy"
                src="/assets/brand/sos-hands-board.jpg"
              />
              <div className="kc-sos-inner">
                <h2 className="kc-sos-title" id="sos">
                  SOS KézRelax villámkurzus
                </h2>
                <p className="kc-sos-p">
                  Ínhüvelygyulladás, kéztőalagút-szindróma, teniszkönyök? Gyors
                  megoldás speciális gyakorlatokkal, amivel magadnak is
                  enyhítheted a kézfájdalmad, drága eszközök és hosszú, macerás
                  gyakorlatok nélkül.
                </p>
                <a
                  className="kc-sos-cta"
                  href="https://www.kineticare.hu/kezrelax"
                >
                  <span aria-hidden="true">→</span> Kérem a villámkurzust
                </a>
              </div>
            </section>

            <footer className="kc-footer">
              <div className="kc-footer-top">
                <a className="kc-footer-link" href="mailto:info@kineticare.hu">
                  Írjon nekünk
                </a>
                <img
                  alt="KinetiCare logó"
                  className="kc-footer-logo"
                  loading="lazy"
                  src="/assets/site/logo-kineticare.png"
                />
              </div>
              <div className="kc-footer-meta">
                <a href="mailto:info@kineticare.hu">info@kineticare.hu</a>
                <span>© 2026 KinetiCare, minden jog fenntartva</span>
              </div>
              <div className="kc-footer-legal">
                <a href="https://www.kineticare.hu/adatvedelem">
                  Adatkezelési és adatvédelmi szabályzat
                </a>
                <a href="https://www.kineticare.hu/aszf">
                  Általános szerződési feltételek
                </a>
                <a href="https://www.kineticare.hu/impresszum">Impresszum</a>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
