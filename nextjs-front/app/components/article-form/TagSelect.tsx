"use client";

import Plus from "@/public/Plus.svg";

import { useEffect, useRef, useState } from "react";
import type { Tag } from "@/app/types/models";
import TagBox from "../ui/TagBox";

interface TagSelectProps {
  tags: Tag[];
  selectedTagIds: number[];
  setSelectedTagIds: (ids: number[]) => void;
  pendingTags: string[];
  setPendingTags: (names: string[]) => void;
}

export default function TagSelect({
  tags,
  selectedTagIds,
  setSelectedTagIds,
  pendingTags,
  setPendingTags,
}: TagSelectProps) {
  const [showPicker, setShowPicker] = useState(false); // tag検索のポップオーバーが表示・非表示の切り替え
  const [query, setQuery] = useState(""); // 入力されている検索文字
  const pickerRef = useRef<HTMLDivElement>(null); // ポップオーバー外のクリック検知用
  const inputRef = useRef<HTMLInputElement>(null); // ポップオーバーが開かれた際に、input(検索欄)に自動フォーカスされるようにする

  // ポップオーバー外をクリックされたら閉じる処理document.addEventListenerを使用するため、メモリーク対策でuseEffect内で処理
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // useEffectはDOM更新後に動くことが保障されているので、カーソルにフォーカスする処理は
  // useEffect内に書く
  useEffect(() => {
    if (showPicker) {
      inputRef.current?.focus();
    }
  }, [showPicker]);

  // 開閉処理（追加ボタン押下時の処理）
  function togglePicker() {
    setShowPicker((v) => !v);
    setQuery("");
  }

  // tagsの内、選択・未選択のタグ
  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const availableTags = tags.filter((t) => !selectedTagIds.includes(t.id));

  const trimmedQuery = query.trim(); // 前後の空白削除
  // trimmedQueryを未選択タグから検索
  const filteredTags = availableTags.filter((t) =>
    t.name.toLowerCase().includes(trimmedQuery.toLowerCase()),
  );
  // 既に登録されているtag（既存）とクエリが完全一致はtrue
  const hasExactMatch = tags.some(
    (t) => t.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  // 既に登録されているtag（新規）とクエリが完全一致はtrue
  const isDuplicatePending = pendingTags.some(
    (name) => name.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  // 既に登録されているタグと被りがなくて一文字以上の場合タグ追加可能
  const canCreateTag =
    trimmedQuery.length > 0 && !hasExactMatch && !isDuplicatePending;

  // 既存タグの削除登録
  function addTag(id: number) {
    setSelectedTagIds([...selectedTagIds, id]);
    setShowPicker(false);
  }
  function removeTag(id: number) {
    setSelectedTagIds(selectedTagIds.filter((t) => t !== id));
  }

  // 新規タグの登録削除
  function createPendingTag() {
    if (!canCreateTag) return;
    setPendingTags([...pendingTags, trimmedQuery]);
    setShowPicker(false);
  }
  function removePendingTag(name: string) {
    setPendingTags(pendingTags.filter((t) => t !== name));
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-gray-700">タグ</p>
      <div className="flex flex-wrap gap-1.75 items-center">
        {selectedTags.map((tag) => (
          <TagBox
            key={tag.id}
            tag={tag.name}
            isLink={false}
            title="クリックで削除"
            onClick={() => removeTag(tag.id)}
          />
        ))}
        {pendingTags.map((name) => (
          <TagBox
            key={name}
            tag={name}
            isLink={false}
            isPending
            title="クリックで削除（記事保存時に新規作成されます）"
            onClick={() => removePendingTag(name)}
          />
        ))}

        <div className="relative" ref={pickerRef}>
          <span
            onClick={togglePicker}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-xs font-medium text-[#8a9099] border border-dashed border-black/20 cursor-pointer hover:bg-[#f9f9f9] whitespace-nowrap"
          >
            <Plus className="w-3 h-3 shrink-0" />
            追加
          </span>
          {/* ポップーオーバー */}
          {showPicker && (
            <div className="absolute top-8 left-0 bg-white border border-black/10 rounded-lg shadow-lg z-10 w-56 overflow-hidden">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreateTag) createPendingTag();
                }}
                placeholder="タグを検索"
                className="w-full px-3 py-2 text-xs border-b border-black/10 outline-none"
              />
              <div className="max-h-48 overflow-y-auto py-1">
                {/* クエリ検索結果表示 */}
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => addTag(tag.id)}
                    className="block w-full text-left px-3 py-1.5 text-xs text-[#3a3d42] hover:bg-[#f2f3f5]"
                  >
                    {tag.name}
                  </button>
                ))}
                {/* 新規タグ追加 */}
                {canCreateTag && (
                  <button
                    onClick={createPendingTag}
                    className="block w-full text-left px-3 py-1.5 text-xs text-[#2c5aa0] hover:bg-[#f2f3f5]"
                  >
                    ＋ 「{trimmedQuery}」を新規タグとして追加
                  </button>
                )}
                {/* タグが追加済みの場合（＝新規追加でもなく検索結果にもない） */}
                {filteredTags.length === 0 && !canCreateTag && (
                  <p className="px-3 py-2 text-xs text-[#adb2ba]">
                    既に登録されているタグです
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
