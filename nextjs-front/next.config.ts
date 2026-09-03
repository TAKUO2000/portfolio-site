import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "takuo-portfolio-develop-bucket-533267285352-ap-northeast-1-an.s3.ap-northeast-1.amazonaws.com",
  },
];

// ローカル開発でMinIOを使う場合、画像ホストを許可リストに追加する（本番は未設定なので影響なし）
if (process.env.S3_PUBLIC_ENDPOINT) {
  const { protocol, hostname, port } = new URL(process.env.S3_PUBLIC_ENDPOINT);
  remotePatterns.push({
    protocol: protocol.replace(":", "") as "http" | "https",
    hostname,
    port,
  });
}

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  images: {
    remotePatterns,
    // next/imageの最適化プロキシはSSRF対策でプライベートIP(コンテナ内部から見た
    // localhostやDocker内部IP)への画像フェッチを拒否するため、MinIO利用時は
    // 最適化を無効化し、ブラウザから直接画像を取得させる
    unoptimized: Boolean(process.env.S3_PUBLIC_ENDPOINT),
  },
};

export default nextConfig;
