"use client";

import GoodIcon from "@/public/good_outline.svg";
import BadIcon from "@/public/bad_outline.svg";
import BookmarkIcon from "@/public/bookmark_outline.svg";

interface ArticleActionButtonsProps {
  likeCount: number;
}

export default function ArticleActionButtons({
  likeCount,
}: ArticleActionButtonsProps) {
  return (
    <div className="border rounded p-4 mt-4 text-sm text-gray-500">
      <p className="font-semibold mb-3 text-center text-xs">この記事は？</p>
      <div className="flex justify-around items-center">
        {/* Good ボタン */}
        <button className="flex flex-col items-center gap-1.5 group cursor-pointer">
          <span className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 group-hover:border-blue-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all duration-150 active:scale-95">
            <GoodIcon className="w-5 h-5" />
          </span>
          <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors duration-150">
            good:{likeCount}
          </span>
        </button>

        {/* Bad ボタン */}
        <button className="flex flex-col items-center gap-1.5 group cursor-pointer">
          <span className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 group-hover:border-red-400 group-hover:text-red-500 group-hover:bg-red-50 transition-all duration-150 active:scale-95">
            <BadIcon className="w-5 h-5" />
          </span>
          <span className="text-xs text-gray-400 group-hover:text-red-500 transition-colors duration-150">
            Bad
          </span>
        </button>

        {/* Bookmark ボタン */}
        <button className="flex flex-col items-center gap-1.5 group cursor-pointer">
          <span className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 group-hover:border-yellow-400 group-hover:text-yellow-500 group-hover:bg-yellow-50 transition-all duration-150 active:scale-95">
            <BookmarkIcon className="w-5 h-5" />
          </span>
          <span className="text-xs text-gray-400 group-hover:text-yellow-500 transition-colors duration-150">
            保存
          </span>
        </button>
      </div>
    </div>
  );
}
