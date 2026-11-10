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
