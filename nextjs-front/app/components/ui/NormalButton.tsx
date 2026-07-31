"use client";

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
}

export default function NormalButton({
  color,
  buttonLabel,
  onClick,
  disabled,
}: NormalButtonProps) {
  return (
    <button
      className={button({ color })}
      onClick={onClick}
      disabled={disabled}
    >
      {buttonLabel}
    </button>
  );
}
