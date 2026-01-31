import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config `pageExtensions` to include markdown and MDX files */
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["*.sandbox.local"],
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
