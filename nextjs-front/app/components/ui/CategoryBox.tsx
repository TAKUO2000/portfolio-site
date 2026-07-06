import Link from "next/link";
import type { FC, SVGProps } from "react";
import Code from "@/public/Code.svg";
import Controller from "@/public/Controller.svg";
import ThreeDots from "@/public/ThreeDots.svg";
import Necktie from "@/public/Necktie.svg";
import { CATEGORY_COLORS, CATEGORY_DEFAULT_COLOR } from "@/app/constants/colorsData";

interface CategoryBoxProps {
  category: string;
  id: number;
}

const ICON_MAP: Record<number, FC<SVGProps<SVGSVGElement>>> = {
  1: Code, // 技術
  2: Controller, // ライフスタイル
  3: Necktie, // ビジネス
};

export default function CategoryBox({ category, id }: CategoryBoxProps) {
  const color = CATEGORY_COLORS[id] ?? CATEGORY_DEFAULT_COLOR;
  const Icon = ICON_MAP[id] ?? ThreeDots; // その他・未知のカテゴリ

  return (
    <Link href={/**修正予定 */ `/dev`}>
      <div
        className={`flex items-center gap-1.5 mr-2 px-2.75 py-1 rounded-lg  ${color.bg} ${color.hoverBg} active:opacity-60 transition-colors`}
      >
        <Icon className={`w-6 h-6 ${color.icon}`} />
        <span className={`text-xs font-semibold  ${color.text}`}>
          {category}
        </span>
      </div>
    </Link>
  );
}
