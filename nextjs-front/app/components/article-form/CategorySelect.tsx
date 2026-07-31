"use client";

import { useEffect, useRef, useState } from "react";
import CategoryBox from "../ui/CategoryBox";
import type { Category } from "@/app/types/models";

interface CategorySelectProps {
  categories: Category[];
  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;
}

export default function CategorySelect({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
}: CategorySelectProps) {
  const [selectOpen, setSelectOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setSelectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function togglePicker() {
    setSelectOpen((v) => !v);
  }

  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId,
  );
  const unselectedCategory = categories.filter(
    (cat) => cat.id !== selectedCategoryId,
  );

  function selectCategory(id: number) {
    setSelectedCategoryId(id);
    setSelectOpen(false);
  }

  function deselectCategory() {
    setSelectedCategoryId(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-gray-700">カテゴリ</p>
      <div className="flex flex-wrap gap-1.75 items-center">
        {selectedCategory && (
          <CategoryBox
            category={selectedCategory.name}
            id={selectedCategory.id}
            isLink={false}
            title="クリックで解除"
            onClick={deselectCategory}
          />
        )}

        <div className="relative" ref={pickerRef}>
          {!selectedCategoryId && (
            <span
              onClick={togglePicker}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-xs font-medium text-[#8a9099] border border-dashed border-black/20 cursor-pointer hover:bg-[#f9f9f9] whitespace-nowrap"
            >
              カテゴリ選択
            </span>
          )}
          {selectOpen && (
            <div className="absolute top-8 left-0 bg-white border border-black/10 rounded-lg shadow-lg z-10 w-40 overflow-hidden py-1">
              {unselectedCategory.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  className="block w-full text-left px-3 py-1.5 text-xs text-[#3a3d42] hover:bg-[#f2f3f5]"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
