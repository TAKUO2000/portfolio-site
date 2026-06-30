import Link from "next/link";

interface CategoryBoxProps {
  category: string;
  id: number;
}

const colorMap: Record<number, string> = {
  1: "bg-blue-500 text-white hover:bg-blue-600 active:opacity-50 transition-colors",
  2: "bg-yellow-400 text-white hover:bg-yellow-500 active:opacity-50 transition-colors",
};

const defaultColor =
  "bg-gray-400 text-white hover:bg-gray-500 active:opacity-50 transition-colors";

export default function CategoryBox({ category, id }: CategoryBoxProps) {
  const color = colorMap[id] ?? defaultColor;

  return (
    <Link href={`/categories/${id}`}>
      <div
        className={`inline-block text-sm font-semibold uppercase px-3 py-2 mr-2 rounded-sm ${color}`}
      >
        {category}
      </div>
    </Link>
  );
}
