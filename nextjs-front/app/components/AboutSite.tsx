import Image from "next/image";

interface AboutSiteProps {
  id?: string;
  about: "site" | "me";
  icon: string;
  title: string[];
  text: string;
}

/**
 * 画像・見出し・文章の置き場所（grid-template-areas）。
 *
 * md以上：画像と「見出し＋文章」を2列に並べる。サイトの紹介は画像が左、自己紹介は画像が右（交互に並べる）。
 * md未満：画像を小さくして見出しの横に置き、文章はその下に幅いっぱいで置く。
 *   2列のままだと、見出しの長い英単語（「TAKUO2000」）が縮まず、画像の列が押しつぶされて消えるため（#144）。
 *   画像の左右はmd以上と同じにする（自己紹介の文章の「右の犬」が、どの幅でも合うように）
 */
const LAYOUT = {
  site: {
    grid: "grid-cols-[auto_minmax(0,1fr)] [grid-template-areas:'icon_title'_'text_text'] md:[grid-template-areas:'icon_title'_'icon_text']",
    title: "text-start md:text-end",
  },
  me: {
    grid: "grid-cols-[minmax(0,1fr)_auto] [grid-template-areas:'title_icon'_'text_text'] md:[grid-template-areas:'title_icon'_'text_icon']",
    title: "text-end md:text-start",
  },
} as const;

export default function AboutSite({
  id,
  about,
  icon,
  title,
  text,
}: AboutSiteProps) {
  const layout = LAYOUT[about];

  return (
    <section id={id} className="bg-[#f5f0e8] px-6 py-16 md:py-24">
      <div
        className={`mx-auto grid max-w-2xl items-center gap-5 md:grid-cols-2 md:gap-x-16 md:gap-y-6 ${layout.grid}`}
      >
        <div className="flex justify-center [grid-area:icon]">
          {/* 縦長の写真も楕円にならないよう、正方形に切り抜いてから丸くする */}
          <Image
            src={icon}
            alt="Site Icon"
            width={300}
            height={300}
            priority={about === "site"}
            className={`size-26 aspect-square rounded-full object-cover md:h-auto md:w-full md:max-w-75 ${
              about === "site" ? "border-4 border-[#8B7355]" : ""
            }`}
          />
        </div>

        {/*
          md以上は、見出しと文章を画像の高さの真ん中に寄せる（見出しは上の行の下端、文章は下の行の上端）。
          360px未満の幅では、30pxの「TAKUO2000」が画像の横に収まらず重なるので、24pxにする
        */}
        <h2
          className={`text-2xl font-bold leading-tight [grid-area:title] min-[360px]:text-3xl md:self-end md:text-5xl ${layout.title}`}
        >
          {title.map((line, index) => (
            <span key={index} className="block">
              {line}
            </span>
          ))}
        </h2>

        {/*
          説明文は、どの幅でも左寄せにする（複数行の日本語を右寄せにすると、行の始まりがばらばらで読みにくい）。
          日本語はほぼ1文字ごとに折り返せるので、文節の切れ目でだけ折り返し（auto-phrase。<html lang="ja"> が要る。
          対応していないブラウザは今までどおりの折り返し）、最後の行が短くなりすぎないようにする（text-pretty）
        */}
        <p className="text-sm leading-relaxed text-pretty text-gray-700 [grid-area:text] [word-break:auto-phrase] md:self-start md:text-base">
          {text}
        </p>
      </div>
    </section>
  );
}
