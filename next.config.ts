import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The OG route reads its fonts with fs at runtime; make sure they ship with it.
  outputFileTracingIncludes: {
    "/api/og": ["./assets/fonts/**"],
  },
};

export default nextConfig;
