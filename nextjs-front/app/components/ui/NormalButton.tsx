"use client";

import Link from "next/link";
import { tv } from "tailwind-variants";

// 枠は box-shadow で外側に描く（globals.css の pixel-*）。隣のボタンとは、枠の分より広く空ける
const button = tv({
  base: "inline-block cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    color: {
      white:
        "pixel-border-2 pixel-press-sm px-4 py-1.5 text-sm leading-5 bg-white text-gray-700 [--pixel-c:var(--color-gray-300)]",
      green:
        "pixel-border-2 pixel-press-sm px-4 py-1.5 text-sm leading-5 bg-green-600 text-white [--pixel-c:var(--color-green-600)]",
      red: "pixel-border-2 pixel-press-sm px-4 py-1.5 text-sm leading-5 bg-red-500 text-white [--pixel-c:var(--color-red-500)]",
      // ページの主な操作に使う大きいボタン（404 の「トップへ戻る」など）
      black:
        "pixel-card pixel-press px-10 py-4 text-base bg-foreground text-white [--pixel-c:var(--color-foreground)]",
    },
  },
  defaultVariants: {
    color: "white",
  },
});

interface NormalButtonBaseProps {
  color?: "white" | "green" | "red" | "black";
  buttonLabel: string;
}

/**
 * hrefありはLink、hrefなしはbuttonとして描画するため、
 * それぞれで意味を持たないpropsは型レベルで渡せないようにしている。
 */
type NormalButtonProps = NormalButtonBaseProps &
  (
    | {
        /** 押すと遷移するだけのボタンはこちら。リンクとして描画する */
        href: string;
        onClick?: never;
        disabled?: never;
      }
    | {
        href?: never;
        onClick?: () => void;
        disabled?: boolean;
      }
  );

export default function NormalButton({
  color,
  buttonLabel,
  onClick,
  disabled,
  href,
}: NormalButtonProps) {
  // 遷移するだけのものをbuttonで作ると、中クリックでの新規タブや
  // プリフェッチが効かなくなるため、hrefがあるときはLinkで描画する
  if (href !== undefined) {
    return (
      <Link href={href} className={button({ color })}>
        {buttonLabel}
      </Link>
    );
  }

  return (
    <button className={button({ color })} onClick={onClick} disabled={disabled}>
      {buttonLabel}
    </button>
  );
}
