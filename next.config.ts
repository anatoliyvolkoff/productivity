import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embedded Postgres ships WASM + data files that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
