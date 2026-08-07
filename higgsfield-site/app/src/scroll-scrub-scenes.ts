/**
 * Scene data for the KinetiCare scroll-scrub journey.
 *
 * Single-shot: ONE continuous hand-opening film is scrubbed end to end. The
 * journey chapters read over that one clip; there are no separate segments,
 * so the motion is seamless. The poster is the exact first frame of the
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
    poster: "/assets/world/scene-01-poster.png",
    mobilePoster: "/assets/world/scene-01-mobile-poster.png",
    clip: "/assets/world/scene-01.mp4",
    mobileClip: "/assets/world/scene-01-mobile.mp4",
    title: "A kéz újra megtanul nyílni",
    body: "A fájdalomtól a szabadságig, egyetlen folyamatos úton. A bezárult kéz szép lassan visszanyeri a mozgását.",
    tags: ["Kéz", "Csukló", "Könyök", "Váll"],
    scroll: 4.6,
    linger: 0.16,
    align: "left",
  },
];
