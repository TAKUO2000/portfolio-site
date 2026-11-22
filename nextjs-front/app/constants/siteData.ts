/** フッターにアイコンを出すサービス。増やすときはFooterのICON_MAPにもアイコンを足す */
export type AccountService = "X" | "Qiita" | "GitHub";

const FOOTER_ACCOUNTS: {
  service: AccountService;
  handle: string;
  href: string;
}[] = [
  { service: "X", handle: "@TAKUO2000", href: "https://x.com/TAKUO2000" },
  {
    service: "Qiita",
    handle: "@TAKUO2000",
    href: "https://qiita.com/TAKUO2000",
  },
  {
    service: "GitHub",
    handle: "@TAKUO2000",
    href: "https://github.com/TAKUO2000",
  },
];

export const SITE_DATA = {
  title: "TAKUO_Log",
  // 検索結果に出る説明文（meta description）。画面には出さない。
  // 「TAKUO Log」「ブログ」と分けた表記でも検索に掛かるよう、文中に入れている
  description:
    "TAKUO Log（TAKUO_Log）は、TAKUO2000のブログです。読んだ本と、学んだ技術を書き残しています。",
  // サイト名の別の書き方。構造化データ（WebSiteのalternateName）で検索エンジンに伝える
  alternateNames: [
    "TAKUO Log",
    "takuolog",
    "TAKUO's Blog",
    "takuoblog",
    "takuosblog",
  ],

  aboutSite: {
    title: ["About", "This Site"],
    description:
      "読んだ本のこと、手を動かして学んだ技術のこと、日々のちょっとした気づきなんかを書き残している場所です。あとで見返して、こんなこと考えてたなと思い出せるようにしています。",
  },

  latestArticle: {
    title: "Latest Article",
    moreButtonHref: "/articles?sort=latest",
  },

  popularArticles: {
    title: "Popular Articles",
    moreButtonHref: "/articles?sort=popular",
  },

  aboutMe: {
    title: ["About", "TAKUO2000"],
    description:
      "普通のエンジニアです。仕事以外でも技術を触るのが好きで、気づいたら休日もコードを書いています。学んだことを忘れないようにここに書き残しています。あと右の犬は実家で飼っていた犬で名前は「チロ」って言います。",
  },

  footer: {
    name: "TAKUO2000",
    email: "contact@takuosblog.com",
    accounts: FOOTER_ACCOUNTS,
  },
};
