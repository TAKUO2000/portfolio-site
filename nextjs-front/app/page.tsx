import AboutSite from "./components/AboutSite";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <AboutSite left={true} />
      <AboutSite right={true} />
      <Footer />
    </main>
  );
}
