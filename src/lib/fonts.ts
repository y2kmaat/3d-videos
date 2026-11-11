import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Condensed, heavy display font for Shorts-style headlines and captions.
// Bundled locally (public/fonts, SIL OFL) so renders don't depend on network access.
export const SHORTS_FONT = "Anton";

loadFont({
  family: SHORTS_FONT,
  url: staticFile("fonts/Anton-Regular.woff2"),
  weight: "400",
});

// Caption font (style.md §5): Inter Bold, bundled (SIL OFL, see fonts/Inter-OFL.txt).
export const CAPTION_FONT = "Inter";

loadFont({
  family: CAPTION_FONT,
  url: staticFile("fonts/Inter-Bold.woff2"),
  weight: "700",
});
