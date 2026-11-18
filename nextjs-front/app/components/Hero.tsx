"use client";

import dynamic from "next/dynamic";

// threeは重いので初期JSに含めず、WebGLの無いサーバー側では描画しない
const PointingHandCanvas = dynamic(() => import("./PointingHandCanvas"), {
  ssr: false,
});

const SCROLL_DURATION_MS = 900;

export default function Hero() {
  // shortLabel：スマホの幅（md未満）では3つを横に並べるので、長い文言だけ短くする。
  // それでも390px未満では1行に収まらないので、文節の切れ目で折り返す（「サイトに／ついて」。auto-phrase は Chrome・Edge）
  const navLinks: { href: string; label: string; shortLabel?: string }[] = [
    { href: "#latest-article", label: "最新記事" },
    { href: "#popular-articles", label: "人気記事" },
    {
      href: "#about-site",
      label: "このサイトについて",
      shortLabel: "サイトについて",
    },
  ];
  // 画面内スクロールの実装(HTML idを利用して実装)
  const scrollToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    event.preventDefault();

    const target = document.querySelector<HTMLElement>(href);

    if (!target) {
      return;
    }

    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + startY;
    const distance = targetY - startY;
    let startTime: number | null = null;

    const easeInOutCubic = (progress: number) =>
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const scrollFrame = (currentTime: number) => {
      startTime ??= currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1);

      window.scrollTo(0, startY + distance * easeInOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(scrollFrame);
      } else {
        history.pushState(null, "", href);
      }
    };

    requestAnimationFrame(scrollFrame);
  };

  return (
    // md未満は、ヘッダー（globals.css の --header-h）と合わせてちょうど1画面にする（ページを開いたときに Hero だけが映る）。
    // 中身は、上下中央より少し下に置く（下の「余りの高さを分ける」を参照）
    <section className="relative bg-[#f4f1eb] text-center px-6 py-6 min-h-[calc(100svh_-_var(--header-h))] flex flex-col items-center justify-center max-md:overflow-hidden md:min-h-screen md:py-24">
      {/* 余りの高さを分ける（md未満だけ）。上6：下4。ボタンの下の余白を減らしつつ、ボタンが下端に寄りすぎないようにする。
          手が見出しの上に伸びるので、中身を少し下げたほうがつり合う。寄せ具合は、この flex-6 と下の flex-4 で変える */}
      <div className="flex-6 md:hidden" aria-hidden="true" />
      {/* md未満は、見出しと手をこの枠にまとめる。md以上は枠を無いものとして扱い（contents）、今までどおり section の中に並べる */}
      <div className="max-w-full min-w-0 max-md:relative md:contents">
        {/* 背景の3D。ボタンのクリックを邪魔しないようポインターイベントは素通しにする */}
        {/* yは見出しの中心の裏。大きくするほど指も長く映るので、
            指先がボタンからはみ出さない範囲でscaleを決めている。
            スマホの幅では画面が狭く、手が大きく見えるので、少し小さくする */}
        {/* 手の大きさと位置は描画の枠の高さで決まる。md未満は、画面の高さで手の大きさが変わらないよう、
            枠を高さ600pxの固定にし、枠の中心が見出しの中心の104px下に来るよう上にずらす
            （-172px = 見出しの中心 24px + 104px − 枠の半分 300px。はみ出す分は section で切る） */}
        <PointingHandCanvas
          className="absolute -inset-x-6 -top-43 h-150 pointer-events-none md:inset-x-0 md:top-0 md:h-full"
          modelPosition={[0, 0.59, -0.6]}
          modelRotation={[0, 0, 0]}
          modelScale={1.3}
          mobileModelScale={1.1}
        />
        {/* 英字の書体（Silkscreen）は1文字が広い。md未満は画面の幅に合わせて小さくし、幅 320px でも1行に収める */}
        <h1 className="relative mb-3 font-pixel text-[clamp(32px,10.5vw,44px)] leading-none font-bold whitespace-nowrap md:text-[clamp(40px,7vw,84px)]">
          TAKUO_Log
        </h1>
        {/* スマホの幅では2行になる。文節の切れ目で折り返し、2行の長さをそろえる（「保管／庫。」のように切れないように） */}
        <p className="relative text-base text-balance [word-break:auto-phrase] md:text-lg">
          TAKUO2000が読んだ本と、学んだ技術の保管庫。
        </p>
      </div>
      {/* md未満は3つを横に等分して並べる（折り返して詰まって見えないように）。md以上は今までどおり */}
      {/* ボタンの枠と影は外側にはみ出すので、その分より広く間を空ける */}
      <div className="relative mt-20 grid w-full grid-cols-3 gap-4.5 px-1 md:mt-40 md:flex md:w-auto md:justify-center md:gap-10 md:px-0">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(event) => scrollToSection(event, link.href)}
            data-point-target // ホバー中は手がこのボタンの中心を指す
            className="pixel-card pixel-press flex min-h-14 items-center justify-center bg-foreground px-0.5 py-2 text-center text-sm leading-[1.35] text-white [--pixel-c:var(--color-foreground)] md:min-h-0 md:px-10 md:py-4 md:text-base md:leading-normal"
          >
            {link.shortLabel ? (
              <>
                <span className="[word-break:auto-phrase] md:hidden">
                  {link.shortLabel}
                </span>
                <span className="hidden md:inline">{link.label}</span>
              </>
            ) : (
              link.label
            )}
          </a>
        ))}
      </div>
      <div className="flex-4 md:hidden" aria-hidden="true" />
    </section>
  );
}
