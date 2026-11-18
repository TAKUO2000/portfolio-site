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
    <div className="flex flex-col gap-1.5">
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
        // 枠は box-shadow で描く（globals.css の pixel-border-2）。フォーカス中は枠の色を変える
        className="pixel-border-2 resize-none overflow-hidden bg-white px-3 py-2 text-xl leading-[1.4] outline-none [--pixel-c:var(--color-gray-300)] focus:[--pixel-c:var(--color-blue-400)]"
      />
    </div>
  );
}
