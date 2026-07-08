import Link from "next/link";
import { TAG_COLOR } from "@/app/constants/colorsData";

interface TagBoxProps {
  tag: string;
  id: number;
  isLink?: boolean;
  onClick?: () => void;
  title?: string;
}

export default function TagBox({ tag, id, isLink = true, onClick, title }: TagBoxProps) {
  const content = (
    <div
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 mr-2 px-2.75 py-1 rounded-full text-xs font-medium ${TAG_COLOR.bg} ${TAG_COLOR.text} ${TAG_COLOR.hoverBg} active:opacity-60 transition-colors ${onClick ? "cursor-pointer" : ""}`}
    >
      <span className={`w-1.75 h-1.75 rounded-full ${TAG_COLOR.dot}`} />
      {tag}
    </div>
  );

  if (isLink) {
    return <Link href={/**修正予定 */ `/dev`}>{content}</Link>;
  } else {
    return content;
  }
}
