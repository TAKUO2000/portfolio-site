"use client";

import { useEffect } from "react";

export interface ToastNotice {
  type: "success" | "error";
  message: string;
  /** 同じ文言が続けて出たときも、表示し直して消えるまでの時間を数え直すための値。出すたびに変える */
  id: number;
}

/** 成功は読めば済むので自動で消す。失敗は読み落とすと困るので、閉じるまで残す */
const SUCCESS_DURATION_MS = 4000;

interface ToastProps {
  notice: ToastNotice | null;
  onClose: () => void;
}

/**
 * 画面の右下に重ねて出す通知。
 *
 * 一覧の上などに差し込むと、出たり消えたりするたびに下の要素がずれて押し間違えを招く。
 * 画面に固定して重ねることで、周りのレイアウトに影響させない。
 *
 * 読み上げ用の領域は、内容が入る前から置いておかないと読み上げられないことがあるため、
 * 通知が無いときも空の領域だけは描画しておく。
 */
export default function Toast({ notice, onClose }: ToastProps) {
  useEffect(() => {
    if (notice?.type !== "success") return;

    const timer = setTimeout(onClose, SUCCESS_DURATION_MS);
    return () => clearTimeout(timer);
    // idが変わったときだけ数え直す。onCloseは呼び出し側で毎回作り直されるため含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice?.id, notice?.type]);

  const success = notice?.type === "success" ? notice : null;
  const error = notice?.type === "error" ? notice : null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
      <div role="status" className="w-full">
        {success && (
          <ToastBody
            className="border-green-200 bg-green-50 text-green-800"
            message={success.message}
            onClose={onClose}
          />
        )}
      </div>
      {/* 失敗はすぐ伝える必要があるため、alertで読み上げさせる */}
      <div role="alert" className="w-full">
        {error && (
          <ToastBody
            className="border-red-200 bg-red-50 text-red-700"
            message={error.message}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function ToastBody({
  className,
  message,
  onClose,
}: {
  className: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${className}`}
    >
      <p className="flex-1 break-words">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="通知を閉じる"
        className="shrink-0 cursor-pointer leading-none opacity-60 transition-opacity hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
