/**
 * Scene data for the KinetiCare scroll-scrub journey.
 *
 * Single-shot: ONE continuous hand-opening film is scrubbed end to end. The
 * v3 film tells the therapy arc in one take: a closed fist in cool light, a
 * therapist's hands enter and support it, then release, and the hand finishes
 * opening on its own in warm light. There are no cuts, so the scrub is
 * seamless in both directions. The poster is the exact first frame of the
 * encoded clip beside it.
 */
import type {
  ScrollScrubScene,
  ScrollScrubTheme,
} from "@/components/scroll-scrub/scroll-scrub";

/** Brand tokens from the design brief (KinetiCare blue on cool paper white). */
export const scrollScrubTheme: ScrollScrubTheme = {
  accent: "#3D7FB8",
  background: "#F6F9FC",
  ink: "#10233A",
  muted: "#54697F",
};

export const scrollScrubScenes: ScrollScrubScene[] = [
  {
    id: "ut",
    label: "A kéz nyílása",
    poster: "/assets/world/scene-02-poster.png",
    mobilePoster: "/assets/world/scene-02-mobile-poster.png",
    clip: "/assets/world/scene-02.mp4",
    mobileClip: "/assets/world/scene-02-mobile.mp4",
    title: "Hatékony és biztonságos módszerek a kéz és a kar fájdalmai ellen",
    body: "Professzionális, mégis emberközeli terápiás megoldásokkal kezeljük a különböző mozgásszervi problémákat, hogy te ismét önfeledten dolgozhass, sportolhass vagy gondoskodhass szeretteidről.",
    tags: ["Kéz", "Csukló", "Könyök", "Váll"],
    scroll: 4.6,
    linger: 0.16,
    align: "left",
  },
];
