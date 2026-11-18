/**
 * 開発サーバーの画面をスクリーンショットに撮る（見た目の確認用）。
 *
 * 使い方（開発サーバーを起動してから、nextjs-front で）：
 *   npm run screenshot                                   既定のページを、既定の幅で撮る
 *   npm run screenshot -- /articles /dev                 ページを指定する
 *   npm run screenshot -- --widths=768,1280 /articles    幅を指定する
 *   npm run screenshot -- --user=admin /articles/manage  ログインした状態で撮る（user / admin）
 *   npm run screenshot -- --menu /                       ヘッダーのメニューを開いて撮る（スマホの幅だけ）
 *   npm run screenshot -- --viewport /                   ページ全体ではなく、最初に見える範囲だけを撮る
 *
 * 画像は screenshots/ に出す（コミットしない）。
 * 初回と、playwright の版を上げたあとは、ブラウザを入れる：npx playwright install chromium
 * （OS のライブラリが足りないときは、--with-deps を付ける。sudo が要る）
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "screenshots",
);

const DEFAULT_PATHS = ["/", "/articles", "/dev"];
// PC・スマホ・崩れやすい一番狭い幅
const DEFAULT_WIDTHS = [1280, 390, 320];
const VIEWPORT_HEIGHT = 800;
// ヘッダーがメニューをたたむ幅（Tailwind の md）
const MOBILE_MAX_WIDTH = 767;

// ログイン状態は /api/user の応答を差し替えて作る（実際のログインは要らない）。
// ヘッダーの表示と、管理者だけが開けるページの判定に効く。
// セッションは無いので、ログインが必要な API は呼んでも失敗する
const MOCK_USERS = {
  user: {
    id: 1,
    name: "Screenshot User",
    email: "user@example.com",
    role: "user",
    email_verified: true,
  },
  admin: {
    id: 1,
    name: "Screenshot Admin",
    email: "admin@example.com",
    role: "admin",
    email_verified: true,
  },
};

function parseArgs(argv) {
  const options = {
    paths: [],
    widths: DEFAULT_WIDTHS,
    user: null,
    menu: false,
    viewportOnly: false,
  };

  for (const arg of argv) {
    if (arg === "--menu") {
      options.menu = true;
    } else if (arg === "--viewport") {
      options.viewportOnly = true;
    } else if (arg.startsWith("--widths=")) {
      options.widths = arg
        .slice("--widths=".length)
        .split(",")
        .map((width) => Number(width));
      if (options.widths.some((width) => !Number.isInteger(width))) {
        throw new Error(`幅は整数をカンマで区切って渡す: ${arg}`);
      }
    } else if (arg.startsWith("--user=")) {
      options.user = arg.slice("--user=".length);
      if (!(options.user in MOCK_USERS)) {
        throw new Error(`--user は user か admin: ${arg}`);
      }
    } else if (arg.startsWith("/")) {
      options.paths.push(arg);
    } else {
      throw new Error(`分からない引数: ${arg}`);
    }
  }

  if (options.paths.length === 0) options.paths = DEFAULT_PATHS;
  return options;
}

/** "/articles/manage?page=2" → "articles-manage-page-2"、"/" → "top" */
function fileNameOf(pagePath, width, { user, menu }) {
  const slug =
    pagePath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "top";
  return [slug, width, user, menu && "menu"].filter(Boolean).join("_") + ".png";
}

async function capture(browser, pagePath, width, options) {
  const context = await browser.newContext({
    viewport: { width, height: VIEWPORT_HEIGHT },
  });
  const page = await context.newPage();

  if (options.user) {
    await page.route("**/api/user", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": new URL(BASE_URL).origin,
          "access-control-allow-credentials": "true",
        },
        body: JSON.stringify(MOCK_USERS[options.user]),
      }),
    );
  }

  // トップは 3D の描画が動き続けるので、通信が止まるのは待たない。読み込みとフォントだけ待つ
  await page.goto(BASE_URL + pagePath, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  if (options.menu) {
    await page.getByRole("button", { name: "メニューを開く" }).click();
  }
  // クライアント側の取得（ログイン状態・記事の一覧）と、アニメーションが落ち着くのを待つ
  await page.waitForTimeout(1500);

  const file = path.join(OUT_DIR, fileNameOf(pagePath, width, options));
  await page.screenshot({ path: file, fullPage: !options.viewportOnly });

  // 横スクロールが出ていたら、その幅でレイアウトがはみ出している
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  console.log(
    `${path.relative(process.cwd(), file)}${overflow > 0 ? `  ※横に ${overflow}px はみ出している` : ""}`,
  );

  await context.close();
}

const options = parseArgs(process.argv.slice(2));
// メニューのボタンはスマホの幅にしか出ない
const widths = options.menu
  ? options.widths.filter((width) => width <= MOBILE_MAX_WIDTH)
  : options.widths;

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  for (const pagePath of options.paths) {
    for (const width of widths) {
      await capture(browser, pagePath, width, options);
    }
  }
} finally {
  await browser.close();
}
