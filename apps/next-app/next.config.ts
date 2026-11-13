import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config `pageExtensions` to include markdown and MDX files */
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["*.sandbox.local"],
  /* Bun's isolated node_modules layout breaks Turbopack's external `pg` alias;
   * bundle it instead. */
  transpilePackages: ["pg"],
  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/static/**",
      },
    ],
  },
};

export default nextConfig;
