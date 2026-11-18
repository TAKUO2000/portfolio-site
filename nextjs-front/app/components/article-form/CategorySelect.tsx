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
    <div className="flex shrink-0 flex-col gap-1.5">
      <p className="text-sm font-medium text-gray-700">カテゴリ</p>
      <div className="flex flex-wrap items-center gap-y-2 pl-0.5">
        {selectedCategory && (
          <CategoryBox
            category={selectedCategory.name}
            id={selectedCategory.id}
            title="クリックで解除"
            onClick={deselectCategory}
          />
        )}

        <div className="relative" ref={pickerRef}>
          {!selectedCategoryId && (
            <span
              onClick={togglePicker}
              className="inline-flex cursor-pointer items-center gap-1 border-2 border-dashed border-[#c4c7cc] bg-white px-2.5 py-0.75 text-xs whitespace-nowrap text-[#8a9099] hover:bg-[#f9f9f9]"
            >
              カテゴリ選択
            </span>
          )}
          {selectOpen && (
            <div className="pixel-border-2 absolute top-9 left-0.5 z-10 w-40 bg-white py-1 [--pixel-c:var(--color-gray-400)]">
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
