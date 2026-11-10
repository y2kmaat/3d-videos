import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Three.js needs WebGL. "angle" uses the GPU when available.
// On machines/containers without a GPU, pass --gl=swangle (see `npm run render:cpu`).
Config.setChromiumOpenGlRenderer("angle");
// Render one frame at a time per tab is safest for WebGL.
Config.setConcurrency(1);

// Optional: use an existing Chrome/Chromium instead of Remotion's auto-downloaded one
// (useful in sandboxes/CI where the download host is blocked).
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
