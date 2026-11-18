import Image from "next/image";
import WindowTitleBar from "@/app/components/ui/WindowTitleBar";

interface AboutSiteProps {
  id?: string;
  about: "site" | "me";
  icon: string;
  /** 画像の内容を伝える文言 */
  iconAlt: string;
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
  iconAlt,
  title,
  text,
}: AboutSiteProps) {
  const layout = LAYOUT[about];

  return (
    <section id={id} className="bg-[#f5f0e8] px-6 py-16 md:py-24">
      <div
        className={`mx-auto grid max-w-2xl items-center gap-6 md:grid-cols-2 md:gap-x-16 md:gap-y-6 ${layout.grid}`}
      >
        <div className="flex justify-center [grid-area:icon]">
          {/* 茶色の枠に黒い影のウィンドウ（記事のカードと色を逆にする）。md未満は小さくして見出しの横に置く */}
          <div className="pixel-window w-25 bg-white [--pixel-c:var(--color-pixel-shadow)] [--pixel-s:var(--color-foreground)] md:w-full md:max-w-70">
            <WindowTitleBar color="brown" size="responsive" />
            {/* 小さなドット絵（40〜56px）を拡大して出す。ぼかさずに拡大して、ドットの角を残す */}
            <Image
              src={icon}
              alt={iconAlt}
              width={280}
              height={280}
              unoptimized
              priority={about === "site"}
              className="block aspect-square w-full object-cover [image-rendering:pixelated]"
            />
          </div>
        </div>

        {/*
          md以上は、見出しと文章を画像の高さの真ん中に寄せる（見出しは上の行の下端、文章は下の行の上端）。
          英字の書体（Silkscreen）は1文字が広く、「TAKUO2000」は 26px で約 200px 要る。
          md未満は画像の横に収まるよう、画面の幅に合わせて3段階で小さくする
        */}
        <h2
          className={`font-pixel text-lg leading-[1.15] font-bold [grid-area:title] min-[360px]:text-[22px] min-[390px]:text-[26px] md:self-end md:text-[40px] ${layout.title}`}
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
        <p className="text-sm leading-[1.75] text-pretty text-gray-700 [grid-area:text] [word-break:auto-phrase] md:self-start md:text-base">
          {text}
        </p>
      </div>
    </section>
  );
}
