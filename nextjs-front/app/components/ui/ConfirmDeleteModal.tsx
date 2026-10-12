"use client";

import { useEffect, useRef } from "react";

import NormalButton from "@/app/components/ui/NormalButton";

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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50"
    >
      <h2 id="confirm-delete-title" className="text-lg font-bold">
        記事を削除しますか？
      </h2>
      <p className="mt-3 rounded bg-gray-50 px-3 py-2 text-sm break-words text-gray-700">
        {targetTitle}
      </p>

      <div className="mt-6 flex justify-end gap-3">
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
    </dialog>
  );
}
