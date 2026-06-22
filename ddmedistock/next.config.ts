import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) ONLY for the Docker
  // image build (which sets DOCKER_BUILD=1 and runs `node server.js`).
  // Standalone output is incompatible with `next start`, so a normal local
  // `npm run build && npm run start` must NOT use it.
  ...(process.env.DOCKER_BUILD ? { output: "standalone" as const } : {}),
};

export default nextConfig;
