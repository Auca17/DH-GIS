import path from "node:path";
import type { NextConfig } from "next";

// [old id, slug] of the first three trails (src/lib/mock-data.ts). Fixed list: no new
// trail will ever have an old id.
const LEGACY_TRAIL_IDS: Array<[string, string]> = [
  ["pequia", "circuito-dh-pequia"],
  ["el-lloron", "circuito-dh-el-lloron"],
  ["escarpado-gloria", "escarpado-cerro-de-la-gloria"],
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Old URLs used the mock ids ("pequia"); they now use the slug. A redirect here runs
  // BEFORE the page renders, so the browser gets a real 307. (A redirect() inside the
  // trail layout runs after streaming started and can only redirect on the client.)
  async redirects() {
    return LEGACY_TRAIL_IDS.map(([id, slug]) => ({
      source: `/cerro/${id}/:path*`,
      destination: `/cerro/${slug}/:path*`,
      permanent: false,
    }));
  },
  partialPrefetching: true,
  turbopack: {
    // Pin the project root: a package-lock.json in the home folder made Next
    // guess the wrong root and warn on every build.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
