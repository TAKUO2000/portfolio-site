"use client";

import { useEffect, useRef } from "react";

interface TitleInputProps {
  title: string;
  setTitle: (title: string) => void;
}

export default function TitleInput({ title, setTitle }: TitleInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="title" className="text-sm font-medium text-gray-700">
        タイトル
      </label>
      <textarea
        id="title"
        ref={textareaRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        maxLength={255}
        placeholder="タイトルを入力"
        rows={1}
        className="border border-gray-300 rounded px-3 py-2 font-medium text-xl resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />
    </div>
  );
}
