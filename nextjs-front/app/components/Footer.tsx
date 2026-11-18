import type { FC, SVGProps } from "react";
import X from "@/public/X.svg";
import Qiita from "@/public/Qiita.svg";
import GitHub from "@/public/GitHub.svg";
import { type AccountService, SITE_DATA } from "@/app/constants/siteData";

// Qiitaは横長の文字ロゴなので、ほかのアイコンと同じ高さだと大きく見える。高さを下げ、枠を横に広げてそろえる
const ICON_MAP: Record<
  AccountService,
  { Icon: FC<SVGProps<SVGSVGElement>>; className: string; boxClassName: string }
> = {
  X: { Icon: X, className: "size-5.5", boxClassName: "w-11" },
  Qiita: { Icon: Qiita, className: "h-4 w-auto", boxClassName: "w-19" },
  GitHub: { Icon: GitHub, className: "size-6", boxClassName: "w-11" },
};

export default function Footer() {
  const { name, email, accounts } = SITE_DATA.footer;

  return (
    <footer className="relative bg-foreground text-white py-16 px-6">
      {/* 境目のディザ模様。高さを持たせず、上にある内容の下端に重ねる */}
      <div
        aria-hidden="true"
        className="pixel-dither-up pointer-events-none absolute inset-x-0 bottom-full z-10 text-foreground"
      />
      <div className="max-w-5xl mx-auto">
        <h2 className="font-pixel text-2xl font-bold mb-8">Connect with me</h2>

        <div className="mb-5">
          <p className="font-pixel text-xl font-bold mb-12">{name}</p>
          <p className="font-pixel text-xs text-gray-400 uppercase tracking-widest mb-2">
            Address
          </p>
          <a href={`mailto:${email}`} className="text-base hover:underline">
            {email}
          </a>
        </div>

        <p className="font-pixel text-xs text-gray-400 uppercase tracking-widest mb-4">
          Find me on
        </p>

        <div className="flex items-center gap-5">
          {accounts.map(({ service, handle, href }) => {
            const { Icon, className, boxClassName } = ICON_MAP[service];
            return (
              <a
                key={service}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${service}（${handle}）`}
                title={`${service}（${handle}）`}
                className={`pixel-border-2 pixel-press-sm flex h-11 items-center justify-center [--pixel-c:#fff] ${boxClassName}`}
              >
                <Icon className={className} />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
