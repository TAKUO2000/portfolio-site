import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "takuo-portfolio-develop-bucket-533267285352-ap-northeast-1-an.s3.ap-northeast-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
