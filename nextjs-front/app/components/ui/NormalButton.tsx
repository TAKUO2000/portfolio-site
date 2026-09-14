"use client";

import Link from "next/link";
import { tv } from "tailwind-variants";

const button = tv({
  base: "px-4 py-1.5 rounded font-medium transition-colors duration-150 cursor-pointer active:scale-95 text-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
  variants: {
    color: {
      white: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
      green: "bg-green-600 text-white hover:bg-green-600",
      red: "bg-red-500 text-white hover:bg-red-600",
    },
  },
  defaultVariants: {
    color: "white",
  },
});

interface NormalButtonProps {
  color?: "white" | "green" | "red";
  buttonLabel: string;
  onClick?: () => void;
  disabled?: boolean;
  /** 押すと遷移するだけのボタンはこちら。リンクとして描画する */
  href?: string;
}

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
