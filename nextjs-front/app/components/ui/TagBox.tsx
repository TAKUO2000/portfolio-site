import Link from "next/link";

interface TagBoxProps {
  tag: string;
  id: number;
}

export default function TagBox({ tag, id }: TagBoxProps) {
  return (
    <Link href={`/tags/${id}`}>
      <div className="inline-block text-xs px-3 py-1 mr-2 rounded-full border border-gray-200 bg-gray-50 text-gray-500">
        {tag}
      </div>
    </Link>
  );
}
