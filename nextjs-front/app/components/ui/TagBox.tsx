import { tv } from "tailwind-variants";
import { TAG_COLOR } from "@/app/constants/colorsData";

const tagBox = tv({
  // 枠が外側に 2px ずつはみ出すので、右の余白はその分を足している
  base: `inline-flex items-center gap-1.5 mr-2.5 text-xs ${TAG_COLOR.text}`,
  variants: {
    isPending: {
      // まだ保存していないタグ。破線の枠は box-shadow で描けないので border にし、その分だけ余白を減らす
      true: "border-2 border-dashed border-[#c4c7cc] bg-white px-1.75 py-px",
      false: `pixel-fill-2 px-2.25 py-0.75 ${TAG_COLOR.fill}`,
    },
    clickable: {
      true: "cursor-pointer active:opacity-60",
    },
  },
  compoundVariants: [
    { isPending: false, clickable: true, class: TAG_COLOR.hoverFill },
    { isPending: true, clickable: true, class: "hover:bg-[#f4f5f6]" },
  ],
  defaultVariants: {
    isPending: false,
  },
});

interface TagBoxProps {
  tag: string;
  onClick?: () => void;
  title?: string;
  isPending?: boolean;
}

export default function TagBox({
  tag,
  onClick,
  title,
  isPending = false,
}: TagBoxProps) {
  return (
    <div
      onClick={onClick}
      title={title}
      className={tagBox({ isPending, clickable: !!onClick })}
    >
      <span className={`size-1.5 shrink-0 ${TAG_COLOR.dot}`} />
      {tag}
      {isPending && <span className="text-xs text-red-400 ">NEW</span>}
    </div>
  );
}
