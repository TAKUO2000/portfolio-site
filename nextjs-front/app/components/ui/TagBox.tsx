import { tv } from "tailwind-variants";
import { TAG_COLOR } from "@/app/constants/colorsData";

const tagBox = tv({
  base: "inline-flex items-center gap-1.5 mr-2 px-2.75 py-1 rounded-full text-xs font-medium transition-colors",
  variants: {
    isPending: {
      true: `border border-dashed border-black/20 ${TAG_COLOR.text} hover:bg-[#f4f5f6]`,
      false: `${TAG_COLOR.bg} ${TAG_COLOR.text} ${TAG_COLOR.hoverBg} active:opacity-60`,
    },
    clickable: {
      true: "cursor-pointer",
    },
  },
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
      <span className={`w-1.75 h-1.75 rounded-full ${TAG_COLOR.dot}`} />
      {tag}
      {isPending && <span className="text-xs text-red-400 ">NEW</span>}
    </div>
  );
}
