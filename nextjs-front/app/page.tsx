import AboutSite from "./components/AboutSite";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import LatestArticle from "./components/LatestArticle";
import PopularArticles from "./components/PopularArticles";
import { DUMMY_POPULAR_ARTICLES } from "./constants/dummyData";
import { SITE_DATA } from "./constants/siteData";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <LatestArticle
        id="latest-article"
        article={DUMMY_POPULAR_ARTICLES[0]}
        title={SITE_DATA.latestArticle.title}
        moreButtonHref={SITE_DATA.latestArticle.moreButtonHref}
      />
      <PopularArticles
        id="popular-articles"
        title={SITE_DATA.popularArticles.title}
        moreButtonHref={SITE_DATA.popularArticles.moreButtonHref}
        articles={DUMMY_POPULAR_ARTICLES}
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
  );
}
