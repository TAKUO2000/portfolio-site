"use client";

import Plus from "@/public/Plus.svg";

import { useEffect, useRef, useState } from "react";
import { TAG_COLOR } from "@/app/constants/colorsData";
import TagBox from "../ui/TagBox";

interface Tag {
  id: number;
  name: string;
}

interface TagSelectProps {
  tags: Tag[];
  value: number[];
  onChange: (ids: number[]) => void;
}

export default function TagSelect({ tags, value, onChange }: TagSelectProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTags = tags.filter((t) => value.includes(t.id));
  const availableTags = tags.filter((t) => !value.includes(t.id));

  function removeTag(id: number) {
    onChange(value.filter((t) => t !== id));
  }

  function addTag(id: number) {
    onChange([...value, id]);
    setShowPicker(false);
  }

  return (
    <div className="flex flex-wrap gap-1.75 items-center">
      {selectedTags.map((tag) => (
        <TagBox tag={tag.name} id={tag.id} isLink={false} key={tag.id} />
      ))}
      <div className="relative" ref={pickerRef}>
        <span
          onClick={() => setShowPicker((v) => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-xs font-medium text-[#8a9099] border border-dashed border-black/20 cursor-pointer hover:bg-[#f9f9f9] whitespace-nowrap"
        >
          <Plus className="w-3 h-3 shrink-0" />
          追加
        </span>
        {showPicker && availableTags.length > 0 && (
          <div className="absolute top-8 left-0 bg-white border border-black/10 rounded-lg shadow-lg z-10 py-1 min-w-30">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => addTag(tag.id)}
                className="block w-full text-left px-3 py-1.5 text-xs text-[#3a3d42] hover:bg-[#f2f3f5]"
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
