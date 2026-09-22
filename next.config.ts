import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@livekit/rtc-node", "ws"],
  // Hides the Next.js dev-mode route/bundler indicator badge. Dev-only; it
  // never renders in a production build regardless of this setting.
  devIndicators: false,
};

export default nextConfig;
