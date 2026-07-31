"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type { PendingImage } from "@/app/types/models";
import { markdownPreviewSanitizeSchema } from "@/app/lib/markdownSanitizeSchema";
import {
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_IMAGE_FILE_SIZE_LABEL,
} from "@/app/constants/upload";

// react-markdownはデフォルトでblob:スキームのURLを安全なプロトコル一覧から除外し空文字にしてしまうため、
// 貼り付け画像のプレビュー用blob URLだけ例外的に許可する
function previewUrlTransform(url: string) {
  return url.startsWith("blob:") ? url : defaultUrlTransform(url);
}

interface MarkdownEditorProps {
  body: string;
  setBody: (body: string) => void;
  pendingImages: PendingImage[];
  setPendingImages: (images: PendingImage[]) => void;
}

export default function MarkdownEditor({
  body,
  setBody,
  pendingImages,
  setPendingImages,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [errorMessage, setErrorMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // 画像ファイルを貼り付け位置にblobプレビューとして即挿入し、キャッシュしておく。
  // S3署名付きURLの取得と実際のPUTは送信時にpage.tsx側でまとめて行う
  // （早い段階で取得すると、フォーム入力が長引いた場合に署名付きURLの有効期限切れで失敗するため）
  function cacheImage(file: File) {
    const ta = textareaRef.current;
    if (!file.type.startsWith("image/") || !ta) return;

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      setErrorMessage(
        `画像ファイルは${MAX_IMAGE_FILE_SIZE_LABEL}以内にしてください。`,
      );
      return;
    }

    setErrorMessage("");

    const blobUrl = URL.createObjectURL(file);
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const altText = file.name.split(".")[0] || "image";
    const markdownImage = `![${altText}](${blobUrl})`;
    const newText = body.slice(0, start) + markdownImage + body.slice(end);
    setBody(newText);
    setTimeout(() => {
      ta.focus();
      const newCursor = start + markdownImage.length;
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);

    setPendingImages([...pendingImages, { blobUrl, file }]);
  }

  // Ctrl+V(貼り付け)で画像が来たら、標準の貼り付け動作を止めてcacheImageに渡す
  function handlePasteImage(e: ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    e.preventDefault();
    cacheImage(file);
  }

  // ツールバーの画像ボタン押下時、隠しinputのファイル選択ダイアログを開く
  function handleImageButtonClick() {
    imageFileInputRef.current?.click();
  }

  // ファイル選択ダイアログで画像が選ばれたら、貼り付けと同じ処理をする
  function handleImageFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを連続で選んでもchangeが発火するようにリセット
    if (file) cacheImage(file);
  }

  // ツールバーのボタン押下時、選択範囲をprefix/suffixで挟んで挿入する
  function insertMarkdown(prefix: string, suffix = "") {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end);
    const newText =
      body.slice(0, start) + prefix + selected + suffix + body.slice(end);
    setBody(newText);
    setTimeout(() => {
      ta.focus();
      const newCursor = start + prefix.length + selected.length + suffix.length;
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);
  }

  return (
    <div className="w-full">
      <p className="mb-1 text-sm font-medium text-gray-700">本文</p>
      {/* タブ */}
      <div className="flex items-center gap-0.5 border-b border-black/11">
        <button
          type="button"
          onClick={() => setActiveTab("write")}
          className={`relative top-px rounded-t-[9px] px-4 py-2.25 text-[13px] transition-colors ${
            activeTab === "write"
              ? "border border-t-black/11 border-x-black/11 border-b-white bg-white font-semibold text-[#17181a]"
              : "font-medium text-[#8a9099] hover:text-[#5b6068]"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`relative top-px rounded-t-[9px] px-4 py-2.25 text-[13px] transition-colors ${
            activeTab === "preview"
              ? "border border-t-black/11 border-x-black/11 border-b-white bg-white font-semibold text-[#17181a]"
              : "font-medium text-[#8a9099] hover:text-[#5b6068]"
          }`}
        >
          Preview
        </button>
        <span className="ml-auto pb-1.75 text-[11px] text-[#adb2ba]">
          Markdown対応
        </span>
      </div>

      <div className="rounded-b-[11px] border-x border-b border-black/11 bg-white">
        {activeTab === "write" ? (
          <>
            {/* ツールバー */}
            <div className="flex items-center gap-px border-b border-black/8 px-2.25 py-1.75">
              <ToolbarButton
                title="見出し"
                onClick={() => insertMarkdown("## ")}
                className="text-sm font-bold"
              >
                H
              </ToolbarButton>
              <ToolbarButton
                title="太字"
                onClick={() => insertMarkdown("**", "**")}
                className="text-sm font-serif font-bold"
              >
                B
              </ToolbarButton>
              <ToolbarButton
                title="斜体"
                onClick={() => insertMarkdown("*", "*")}
                className="text-[15px] font-serif font-semibold italic"
              >
                I
              </ToolbarButton>
              <ToolbarButton
                title="打ち消し線"
                onClick={() => insertMarkdown("~~", "~~")}
                className="text-[15px] font-serif font-semibold line-through"
              >
                S
              </ToolbarButton>

              <span className="mx-1.25 h-4 w-px bg-black/10" />

              <ToolbarButton
                title="引用"
                onClick={() => insertMarkdown("> ")}
                className="text-sm font-serif font-bold"
              >
                &#8220;
              </ToolbarButton>
              <ToolbarButton
                title="コード"
                onClick={() => insertMarkdown("`", "`")}
                className="font-mono text-xs font-semibold"
              >
                &lt;/&gt;
              </ToolbarButton>
              <ToolbarButton
                title="リンク"
                onClick={() => insertMarkdown("[", "](url)")}
              >
                <LinkIcon />
              </ToolbarButton>
              <ToolbarButton
                title="リスト"
                onClick={() => insertMarkdown("- ")}
              >
                <ListIcon />
              </ToolbarButton>
              <ToolbarButton title="画像" onClick={handleImageButtonClick}>
                <ImageIcon />
              </ToolbarButton>

              <span className="ml-auto pr-1.5 font-mono text-[11px] text-[#c2c6cc]">
                {body.length.toLocaleString()} 文字
              </span>
            </div>

            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageFileChange}
            />

            {/* 入力欄 */}
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
              }}
              onPaste={handlePasteImage}
              placeholder="Markdownで本文を入力してください..."
              className="min-h-100 w-full resize-none overflow-hidden bg-transparent px-5 py-4.5 font-mono text-[13px] leading-[1.9] text-[#2b2f36] outline-none [font-variant-ligatures:none] font-features-['liga'_0,'calt'_0]"
            />
            {errorMessage && (
              <p className="px-5 pb-3 text-xs text-red-600">{errorMessage}</p>
            )}
          </>
        ) : (
          <div className="prose prose-neutral min-h-74 max-w-none px-5 py-4.5 [&_ul>li::marker]:text-black">
            {body ? (
              <ReactMarkdown
                urlTransform={previewUrlTransform}
                rehypePlugins={[
                  rehypeRaw,
                  [rehypeSanitize, markdownPreviewSanitizeSchema],
                ]}
              >
                {body}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-[#adb2ba]">
                プレビューするコンテンツがありません。
              </p>
            )}
          </div>
        )}

        {/* フッター */}
        <div className="flex items-center justify-between border-t border-black/7 px-3.75 py-2.25 text-[11.5px] text-[#adb2ba]">
          <span className="flex items-center gap-1.5">
            <ListLinesIcon />
            Markdownがサポートされています
          </span>
          <span>画像はドラッグ＆ドロップもしくはctrl+Vで添付</span>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7.25 w-7.75 items-center justify-center rounded-[7px] text-[#5b6068] transition-colors hover:bg-[#f2f3f5] ${className}`}
    >
      {children}
    </button>
  );
}

function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16">
      <circle
        cx="4.5"
        cy="11.5"
        r="2.3"
        fill="none"
        stroke="#5b6068"
        strokeWidth="1.4"
      />
      <circle
        cx="11.5"
        cy="4.5"
        r="2.3"
        fill="none"
        stroke="#5b6068"
        strokeWidth="1.4"
      />
      <line
        x1="6.2"
        y1="9.8"
        x2="9.8"
        y2="6.2"
        stroke="#5b6068"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16">
      <circle cx="2.5" cy="4" r="1.2" fill="#5b6068" />
      <circle cx="2.5" cy="8" r="1.2" fill="#5b6068" />
      <circle cx="2.5" cy="12" r="1.2" fill="#5b6068" />
      <line x1="6" y1="4" x2="14" y2="4" stroke="#5b6068" strokeWidth="1.4" />
      <line x1="6" y1="8" x2="14" y2="8" stroke="#5b6068" strokeWidth="1.4" />
      <line x1="6" y1="12" x2="14" y2="12" stroke="#5b6068" strokeWidth="1.4" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16">
      <rect
        x="1.5"
        y="3"
        width="13"
        height="10"
        rx="2"
        fill="none"
        stroke="#5b6068"
        strokeWidth="1.3"
      />
      <circle cx="5.3" cy="6.5" r="1.2" fill="#5b6068" />
      <path
        d="M2.5 12 L6 8.5 L8.5 11 L10.5 9 L13.5 12"
        fill="none"
        stroke="#5b6068"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListLinesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16">
      <path d="M2 5h12M2 8h12M2 11h7" stroke="#c2c6cc" strokeWidth="1.4" />
    </svg>
  );
}
