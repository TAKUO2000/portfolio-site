import type { FC, SVGProps } from "react";
import Code from "@/public/Code.svg";
import Controller from "@/public/Controller.svg";
import ThreeDots from "@/public/ThreeDots.svg";
import Necktie from "@/public/Necktie.svg";
import {
  CATEGORY_COLORS,
  CATEGORY_DEFAULT_COLOR,
} from "@/app/constants/colorsData";

interface CategoryBoxProps {
  category: string;
  id: number;
  onClick?: () => void;
  title?: string;
  /** アイコンを出さない小さなラベルにする。画像が小さくてアイコン付きが収まらない場所で使う */
  compact?: boolean;
}

const ICON_MAP: Record<number, FC<SVGProps<SVGSVGElement>>> = {
  1: Code, // 技術
  2: Controller, // 趣味
  3: Necktie, // ビジネス
};

export default function CategoryBox({
  category,
  id,
  onClick,
  title,
  compact = false,
}: CategoryBoxProps) {
  const color = CATEGORY_COLORS[id] ?? CATEGORY_DEFAULT_COLOR;
  const Icon = ICON_MAP[id] ?? ThreeDots; // その他・未知のカテゴリ

  return (
    <div
      onClick={onClick}
      title={title}
      // 地と枠を同じ色で塗る。枠が外側に 2px ずつはみ出すので、右の余白はその分を足している
      className={`pixel-fill-2 inline-flex items-center gap-1.5 mr-2.5 ${compact ? "px-2 py-0.5" : "px-2.5 py-1"} ${color.fill} ${onClick ? `cursor-pointer active:opacity-60 ${color.hoverFill}` : ""}`}
    >
      {!compact && <Icon className={`w-6 h-6 ${color.icon}`} />}
      <span className={`text-xs ${color.text}`}>{category}</span>
    </div>
  );
}
