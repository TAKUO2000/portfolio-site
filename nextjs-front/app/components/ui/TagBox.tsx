import Link from "next/link";
import { TAG_COLOR } from "@/app/constants/colorsData";

interface TagBoxProps {
  tag: string;
  id: number;
}

export default function TagBox({ tag, id }: TagBoxProps) {
  return (
    <Link href={`/tags/${id}`}>
      <div
        className={`inline-flex items-center gap-1.5 mr-2 px-[11px] py-1 rounded-full text-xs font-medium ${TAG_COLOR.bg} ${TAG_COLOR.text} ${TAG_COLOR.hoverBg} active:opacity-60 transition-colors`}
      >
        <span className={`w-[7px] h-[7px] rounded-full ${TAG_COLOR.dot}`} />
        {tag}
      </div>
    </Link>
  );
}
