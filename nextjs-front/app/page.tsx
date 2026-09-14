import AboutSite from "./components/AboutSite";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import LatestArticle from "./components/LatestArticle";
import PopularArticles from "./components/PopularArticles";
import { fetchArticles } from "./lib/articles";
import { SITE_DATA } from "./constants/siteData";

/** Topページの人気記事に並べる件数 */
const POPULAR_ARTICLES_COUNT = 3;

export default async function Home() {
  const [latest, popular] = await Promise.all([
    fetchArticles({ sort: "latest", perPage: 1 }),
    fetchArticles({ sort: "popular", perPage: POPULAR_ARTICLES_COUNT }),
  ]);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <LatestArticle
          id="latest-article"
          article={latest.data[0] ?? null}
          title={SITE_DATA.latestArticle.title}
          moreButtonHref={SITE_DATA.latestArticle.moreButtonHref}
        />
        <PopularArticles
          id="popular-articles"
          title={SITE_DATA.popularArticles.title}
          articles={popular.data}
          moreButtonHref={SITE_DATA.popularArticles.moreButtonHref}
        />
        <AboutSite
          id="about-site"
          about={"site"}
          icon={"/IconAboutSite.png"}
          title={SITE_DATA.aboutSite.title}
          text={SITE_DATA.aboutSite.description}
        />
        <AboutSite
          about={"me"}
          icon={"/IconAboutMe.jpg"}
          title={SITE_DATA.aboutMe.title}
          text={SITE_DATA.aboutMe.description}
        />
        <Footer />
      </main>
    </>
  );
}
