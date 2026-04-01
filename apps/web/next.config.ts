import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  transpilePackages: ["@line-crm/shared"],
};

export default nextConfig;
