import { tv } from "tailwind-variants";

const bar = tv({
  slots: {
    root: "flex items-center box-border",
    dot: "",
  },
  variants: {
    color: {
      // 黒い枠のウィンドウ（記事のカードなど）
      black: { root: "bg-foreground", dot: "bg-background" },
      // 茶色の枠のウィンドウ（About の画像）
      brown: { root: "bg-pixel-shadow", dot: "bg-[#f5f0e8]" },
    },
    size: {
      md: { root: "h-6 gap-1.5 px-2", dot: "size-2" },
      // 小さいウィンドウ用。md以上では通常の大きさに戻す
      responsive: {
        root: "h-4 gap-1 px-1.5 md:h-6 md:gap-1.5 md:px-2",
        dot: "size-1 md:size-2",
      },
    },
  },
  defaultVariants: {
    color: "black",
    size: "md",
  },
});

interface WindowTitleBarProps {
  color?: "black" | "brown";
  size?: "md" | "responsive";
  className?: string;
}

/**
 * ウィンドウ風の枠（globals.css の pixel-window）の上に付けるタイトルバー。
 * 四角3つは飾りなので、支援技術には読ませない
 */
export default function WindowTitleBar({
  color,
  size,
  className,
}: WindowTitleBarProps) {
  const { root, dot } = bar({ color, size });

  return (
    <div aria-hidden="true" className={root({ className })}>
      <span className={dot()} />
      <span className={dot()} />
      <span className={dot()} />
    </div>
  );
}
