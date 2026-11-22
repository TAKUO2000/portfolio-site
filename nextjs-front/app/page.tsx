import type { Metadata } from "next";

import AboutSite from "./components/AboutSite";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import JsonLd from "./components/JsonLd";
import LatestArticle from "./components/LatestArticle";
import PopularArticles from "./components/PopularArticles";
import { fetchArticles } from "./lib/articles";
import { SITE_DATA } from "./constants/siteData";
import { getSiteUrl } from "./lib/site";

export const metadata: Metadata = {
  // サイト名だけだと検索語（ブログ）に掛かりにくいので、トップだけ何のサイトかを添える
  title: { absolute: `${SITE_DATA.title} | ${SITE_DATA.footer.name}のブログ` },
  alternates: { canonical: "/" },
};

/** Topページの人気記事に並べる件数 */
const POPULAR_ARTICLES_COUNT = 3;

export default async function Home() {
  // 取得に失敗したら0件で描かずに例外にする。このページは静的に作ってキャッシュしているため、
  // 0件で描くとそれがキャッシュされてしまう。例外にすれば、作り直しのときはNext.jsが前回の
  // ページを出し続けて次のアクセスで作り直しを試し、ビルドのときはビルドが失敗する
  // （Vercelは今のデプロイを出し続ける）
  const [latest, popular] = await Promise.all([
    fetchArticles({ sort: "latest", perPage: 1 }),
    fetchArticles({ sort: "popular", perPage: POPULAR_ARTICLES_COUNT }),
  ]);

  const latestArticle = latest.data[0] ?? null;
  const popularArticles = popular.data;

  return (
    <>
      {/* サイト名とその別の書き方を検索エンジンに伝える（検索結果のサイト名の表示に使われる） */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_DATA.title,
          alternateName: SITE_DATA.alternateNames,
          url: getSiteUrl(),
          description: SITE_DATA.description,
          inLanguage: "ja",
        }}
      />
      <Header />
      <main>
        <Hero />
        <LatestArticle
          id="latest-article"
          article={latestArticle}
          title={SITE_DATA.latestArticle.title}
          moreButtonHref={SITE_DATA.latestArticle.moreButtonHref}
        />
        <PopularArticles
          id="popular-articles"
          title={SITE_DATA.popularArticles.title}
          articles={popularArticles}
          moreButtonHref={SITE_DATA.popularArticles.moreButtonHref}
        />
        <AboutSite
          id="about-site"
          about={"site"}
          icon={"/IconAboutSitePixel.png"}
          iconAlt="サイトのアイコン（ドット絵）"
          title={SITE_DATA.aboutSite.title}
          text={SITE_DATA.aboutSite.description}
        />
        <AboutSite
          about={"me"}
          icon={"/IconAboutMePixel.png"}
          iconAlt="犬のチロ（ドット絵）"
          title={SITE_DATA.aboutMe.title}
          text={SITE_DATA.aboutMe.description}
        />
        <Footer />
      </main>
    </>
  );
}
