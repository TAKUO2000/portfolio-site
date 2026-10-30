import type { FC, SVGProps } from "react";
import X from "@/public/X.svg";
import Qiita from "@/public/Qiita.svg";
import GitHub from "@/public/GitHub.svg";
import { type AccountService, SITE_DATA } from "@/app/constants/siteData";

// Qiitaは横長の文字ロゴなので、ほかのアイコンと同じ高さだと大きく見える。高さを下げてそろえる
const ICON_MAP: Record<
  AccountService,
  { Icon: FC<SVGProps<SVGSVGElement>>; className: string }
> = {
  X: { Icon: X, className: "h-6 w-auto" },
  Qiita: { Icon: Qiita, className: "h-4 w-auto" },
  GitHub: { Icon: GitHub, className: "h-6 w-auto" },
};

export default function Footer() {
  const { name, email, accounts } = SITE_DATA.footer;

  return (
    <footer className="bg-black text-white py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-8">Connect with me</h2>

        <div className="mb-3">
          <p className="text-xl font-bold mb-12">{name}</p>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            Address
          </p>
          <a
            href={`mailto:${email}`}
            className="text-base text-white hover:opacity-70 transition-opacity"
          >
            {email}
          </a>
        </div>

        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
          Find me on
        </p>

        <div className="flex items-center gap-5">
          {accounts.map(({ service, handle, href }) => {
            const { Icon, className } = ICON_MAP[service];
            return (
              <a
                key={service}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${service}（${handle}）`}
                title={`${service}（${handle}）`}
                className="hover:opacity-70 transition-opacity"
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
