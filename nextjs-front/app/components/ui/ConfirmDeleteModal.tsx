"use client";

import { useEffect, useRef } from "react";

import NormalButton from "@/app/components/ui/NormalButton";
import WindowTitleBar from "@/app/components/ui/WindowTitleBar";

interface ConfirmDeleteModalProps {
  /** 開いている間は削除対象のタイトル、閉じているときはnull */
  targetTitle: string | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 削除の確認モーダル。
 *
 * ネイティブのdialogをshowModalで開く。背面の操作を止めることとEscで閉じることを
 * ブラウザが担ってくれるため、フォーカスの閉じ込めなどを自前で書かずに済む。
 */
export default function ConfirmDeleteModal({
  targetTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = targetTitle !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-delete-title"
      // Escで閉じたときもstateを閉じた状態に揃える。削除中は閉じさせない
      onCancel={(e) => {
        e.preventDefault();
        if (!isDeleting) onCancel();
      }}
      // 枠と影は外側にはみ出す（右と下は 8px）ので、左右の余白はその分より広く取る
      className="pixel-window m-auto w-[calc(100%-2.5rem)] max-w-md bg-white [--pixel-c:var(--color-foreground)] backdrop:bg-black/50"
    >
      <WindowTitleBar />
      <div className="p-6">
        <h2 id="confirm-delete-title" className="text-lg font-bold">
          記事を削除しますか？
        </h2>
        <p className="mt-3 bg-gray-50 px-3 py-2 text-sm break-words text-gray-700">
          {targetTitle}
        </p>

        <div className="mt-6 flex justify-end gap-4">
          <NormalButton
            buttonLabel="キャンセル"
            onClick={onCancel}
            disabled={isDeleting}
          />
          <NormalButton
            color="red"
            buttonLabel={isDeleting ? "削除中..." : "削除する"}
            onClick={onConfirm}
            disabled={isDeleting}
          />
        </div>
      </div>
    </dialog>
  );
}
