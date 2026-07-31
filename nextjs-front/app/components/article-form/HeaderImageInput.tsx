"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type { PendingImage } from "@/app/types/models";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_TYPES_ACCEPT,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_IMAGE_FILE_SIZE_LABEL,
} from "@/app/constants/upload";

interface HeaderImageInputProps {
  pendingHeader: PendingImage | null;
  setPendingHeader: (image: PendingImage | null) => void;
}

export default function HeaderImageInput({
  pendingHeader,
  setPendingHeader,
}: HeaderImageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 選択されたファイルをblobプレビューとしてキャッシュする。
  // S3署名付きURLの取得と実際のPUTは送信ボタン押下時（page.tsx側）にまとめて行う
  // （早い段階で取得すると、フォーム入力が長引いた場合に署名付きURLの有効期限切れで失敗するため）
  function cacheHeaderImage(file: File) {
    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
      )
    ) {
      setErrorMessage("画像ファイルを選択してください。");
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      setErrorMessage(
        `画像ファイルは${MAX_IMAGE_FILE_SIZE_LABEL}以内にしてください。`,
      );
      return;
    }

    if (pendingHeader) URL.revokeObjectURL(pendingHeader.blobUrl);

    const blobUrl = URL.createObjectURL(file);
    setErrorMessage("");
    setPendingHeader({ blobUrl, file });
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) cacheHeaderImage(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) cacheHeaderImage(file);
  }

  function removeHeaderImage() {
    if (pendingHeader) URL.revokeObjectURL(pendingHeader.blobUrl);
    setPendingHeader(null);
  }

  return (
    <div className="flex flex-col gap-1  ">
      <p className="text-sm font-medium text-gray-700">ヘッダー画像</p>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES_ACCEPT}
        className="hidden "
        onChange={handleFileInputChange}
      />

      {pendingHeader ? (
        <div className="relative mx-auto max-w-90 overflow-hidden rounded-lg border border-gray-300 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingHeader.blobUrl}
            alt="ヘッダー画像プレビュー"
            className="h-60 max-w-90 object-cover object-center mx-auto block"
          />
          <button
            type="button"
            onClick={removeHeaderImage}
            className="absolute top-2 right-2 cursor-pointer rounded-full bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
          >
            削除
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex mx-auto h-60 w-90 cursor-pointer items-center justify-center rounded-lg border border-dashed text-sm text-gray-400 transition-colors bg-white ${
            isDragging
              ? "border-blue-400 bg-blue-200"
              : "border-gray-500 hover:bg-gray-200"
          }`}
        >
          クリックまたはドラッグ&ドロップで画像を選択
        </div>
      )}

      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
