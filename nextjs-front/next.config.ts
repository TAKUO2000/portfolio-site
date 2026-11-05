import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

type RemotePatterns = NonNullable<NextConfig["images"]>["remotePatterns"];

// next/imageで表示を許可する画像のホスト
function buildRemotePatterns(): RemotePatterns {
  const remotePatterns: RemotePatterns = [];

  // S3のバケットのホスト名（例: <バケット名>.s3.ap-northeast-1.amazonaws.com）
  if (process.env.S3_IMAGE_HOST) {
    remotePatterns.push({
      protocol: "https",
      hostname: process.env.S3_IMAGE_HOST,
    });
  }

  // ローカル開発でMinIOを使う場合、画像ホストを許可リストに追加する（本番は未設定なので影響なし）
  if (process.env.S3_PUBLIC_ENDPOINT) {
    const { protocol, hostname, port } = new URL(
      process.env.S3_PUBLIC_ENDPOINT,
    );
    remotePatterns.push({
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      port,
    });
  }

  return remotePatterns;
}

// 本番のビルドで必要な環境変数が無ければ、ビルドを止める。
// NEXT_PUBLIC_API_BASE_URLはビルド時にクライアントのJSへ埋め込まれるため、
// 未設定のままだとlocalhostへ向いたJSが公開されてしまう
function assertProductionEnv(): void {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
    missing.push("NEXT_PUBLIC_API_BASE_URL");
  }
  if (!process.env.S3_IMAGE_HOST && !process.env.S3_PUBLIC_ENDPOINT) {
    missing.push("S3_IMAGE_HOST");
  }

  if (missing.length > 0) {
    throw new Error(
      `本番のビルドに必要な環境変数が設定されていません: ${missing.join(", ")}（nextjs-front/.env.example を参照）`,
    );
  }
}

export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) {
    assertProductionEnv();
  }

  return {
    turbopack: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
    images: {
      remotePatterns: buildRemotePatterns(),
      // next/imageの最適化プロキシはSSRF対策でプライベートIP(コンテナ内部から見た
      // localhostやDocker内部IP)への画像フェッチを拒否するため、MinIO利用時は
      // 最適化を無効化し、ブラウザから直接画像を取得させる
      unoptimized: Boolean(process.env.S3_PUBLIC_ENDPOINT),
    },
  };
}
