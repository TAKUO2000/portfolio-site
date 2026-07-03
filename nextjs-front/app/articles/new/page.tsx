"use client";

import { useState, useEffect, useRef, DragEvent } from "react";
import ReactMarkdown from "react-markdown";
import { getCsrfToken, getApiErrorMessage } from "@/app/auth/authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Category {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  name: string;
}

interface PendingImage {
  blobUrl: string;
  file: File;
  uploadUrl: string;
  imageUrl: string;
}

const TAG_COLORS = [
  { bg: "bg-[#eef4fb]", text: "text-[#2c5aa0]", dot: "bg-[#4a9ee0]" },
  { bg: "bg-[#eef2fb]", text: "text-[#2f4fa0]", dot: "bg-[#2f6fd6]" },
  { bg: "bg-[#f3effb]", text: "text-[#5a45a0]", dot: "bg-[#8a6ad6]" },
  { bg: "bg-[#eef8f0]", text: "text-[#1a6e3a]", dot: "bg-[#3aaa60]" },
];

export default function ArticleNewPage() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [pendingHeader, setPendingHeader] = useState<PendingImage | null>(null);
  const [isFetchingHeaderUrl, setIsFetchingHeaderUrl] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tagPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/categories`, {
        headers: { Accept: "application/json" },
      }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/tags`, {
        headers: { Accept: "application/json" },
      }).then((r) => r.json()),
    ])
      .then(([cats, tgs]: [Category[], Tag[]]) => {
        setCategories(cats);
        setTags(tgs);
        if (cats.length > 0) setCategoryId(cats[0].id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        tagPickerRef.current &&
        !tagPickerRef.current.contains(e.target as Node)
      ) {
        setShowTagPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const availableTags = tags.filter((t) => !selectedTagIds.includes(t.id));

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

  function removeTag(id: number) {
    setSelectedTagIds((prev) => prev.filter((t) => t !== id));
  }

  function addTag(id: number) {
    setSelectedTagIds((prev) => [...prev, id]);
    setShowTagPicker(false);
  }

  async function uploadHeaderImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }
    // 旧 pendingHeader の blob を解放
    if (pendingHeader) URL.revokeObjectURL(pendingHeader.blobUrl);

    const blobUrl = URL.createObjectURL(file);
    setIsFetchingHeaderUrl(true);
    setError("");
    try {
      const xsrfToken = await getCsrfToken();
      const urlRes = await fetch(`${API_BASE_URL}/api/images/upload-url`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify({ file_name: file.name, media_type: file.type }),
      });
      if (!urlRes.ok) {
        const data = await urlRes.json().catch(() => null);
        setError(getApiErrorMessage(urlRes.status, data, "アップロードURLの取得に失敗しました。"));
        URL.revokeObjectURL(blobUrl);
        return;
      }
      const { upload_url, image_url } = await urlRes.json();
      setPendingHeader({ blobUrl, file, uploadUrl: upload_url, imageUrl: image_url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロード中にエラーが発生しました。");
      URL.revokeObjectURL(blobUrl);
    } finally {
      setIsFetchingHeaderUrl(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadHeaderImage(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadHeaderImage(file);
  }

  async function handlePasteImage(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!imageItem) return;

    e.preventDefault();

    const file = imageItem.getAsFile();
    const ta = textareaRef.current;
    if (!file || !ta) return;

    // blob URL を即時生成してカーソル位置に挿入（プレビューはローカル表示）
    const blobUrl = URL.createObjectURL(file);
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setBody(ta.value.slice(0, start) + `![画像](${blobUrl})` + ta.value.slice(end));

    // pre-signed URL だけ取得して pendingImages に蓄積（S3 PUT はまだしない）
    try {
      const ext = file.type.split("/")[1] ?? "png";
      const xsrfToken = await getCsrfToken();
      const urlRes = await fetch(`${API_BASE_URL}/api/images/upload-url`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify({
          file_name: `paste-${Date.now()}.${ext}`,
          media_type: file.type,
        }),
      });
      if (!urlRes.ok) {
        const data = await urlRes.json().catch(() => null);
        throw new Error(getApiErrorMessage(urlRes.status, data, "アップロードURLの取得に失敗しました。"));
      }
      const { upload_url, image_url } = await urlRes.json();
      setPendingImages((prev) => [
        ...prev,
        { blobUrl, file, uploadUrl: upload_url, imageUrl: image_url },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像URLの取得に失敗しました。");
    }
  }

  async function handleSubmit(status: "draft" | "published") {
    if (!categoryId || !title.trim() || !body.trim() || !summary.trim()) {
      setError("タイトル・要約・本文・カテゴリは必須です。");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      // body に残っている blob URL だけ S3 へ PUT
      const used = pendingImages.filter((img) => body.includes(img.blobUrl));
      const unused = pendingImages.filter((img) => !body.includes(img.blobUrl));

      await Promise.all(
        used.map(async (img) => {
          const res = await fetch(img.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": img.file.type },
            body: img.file,
          });
          if (!res.ok) throw new Error("画像のアップロードに失敗しました。");
        }),
      );

      // body 内の blob URL を S3 URL に一括置換
      let finalBody = body;
      for (const img of used) {
        finalBody = finalBody.replaceAll(img.blobUrl, img.imageUrl);
      }

      // 削除済み画像の blob を解放
      unused.forEach((img) => URL.revokeObjectURL(img.blobUrl));

      // ヘッダー画像を S3 へ PUT
      let headerImageUrl: string | undefined;
      if (pendingHeader) {
        const headerRes = await fetch(pendingHeader.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": pendingHeader.file.type },
          body: pendingHeader.file,
        });
        if (!headerRes.ok) throw new Error("ヘッダー画像のアップロードに失敗しました。");
        headerImageUrl = pendingHeader.imageUrl;
      }

      const xsrfToken = await getCsrfToken();
      const res = await fetch(`${API_BASE_URL}/api/articles`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrfToken,
        },
        body: JSON.stringify({
          title,
          summary,
          body: finalBody,
          status,
          category_id: categoryId,
          tags: selectedTagIds,
          ...(headerImageUrl ? { header_image_url: headerImageUrl } : {}),
          ...(used.length > 0 ? { body_image_urls: used.map((img) => img.imageUrl) } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(getApiErrorMessage(res.status, data, "投稿に失敗しました。"));
        return;
      }
      used.forEach((img) => URL.revokeObjectURL(img.blobUrl));
      if (pendingHeader) URL.revokeObjectURL(pendingHeader.blobUrl);
      window.location.href = "/articles";
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F1EB] flex items-start justify-center px-6 py-11">
      <div className="w-[820px] max-w-full bg-white border border-black/10 rounded-[14px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="px-[34px] pt-[30px] pb-[26px]">
          {/* Status row */}
          <div className="flex items-center gap-3 mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full bg-[#eef0f2] text-[#5b6068] text-xs font-semibold">
              <span className="w-[7px] h-[7px] rounded-full bg-[#8a9099]" />
              下書き
            </span>
            <span
              className="text-xs text-[#adb2ba]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="text-[#5b6068]">draft/new-article</span>{" "}
              <span className="opacity-60">→</span> published
            </span>
          </div>

          {/* Tags & Category */}
          <div className="flex items-center gap-4 flex-wrap pb-[18px] mb-[18px] border-b border-black/[0.08]">
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-semibold text-[#8a9099]">
                タグ
              </span>
              <div className="flex flex-wrap gap-[7px] items-center">
                {selectedTags.map((tag, i) => {
                  const color = TAG_COLORS[i % TAG_COLORS.length];
                  return (
                    <span
                      key={tag.id}
                      onClick={() => removeTag(tag.id)}
                      title="クリックで削除"
                      className={`inline-flex items-center gap-1.5 px-[11px] py-1 rounded-full text-xs font-medium cursor-pointer ${color.bg} ${color.text}`}
                    >
                      <span
                        className={`w-[7px] h-[7px] rounded-full ${color.dot}`}
                      />
                      {tag.name}
                    </span>
                  );
                })}
                <div className="relative" ref={tagPickerRef}>
                  <span
                    onClick={() => setShowTagPicker((v) => !v)}
                    className="inline-flex items-center px-[10px] py-1 rounded-full bg-white text-xs font-medium text-[#8a9099] border border-dashed border-black/20 cursor-pointer hover:bg-[#f9f9f9]"
                  >
                    ＋ 追加
                  </span>
                  {showTagPicker && availableTags.length > 0 && (
                    <div className="absolute top-8 left-0 bg-white border border-black/10 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
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
            </div>

            <span className="w-px h-[18px] bg-black/10" />

            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-semibold text-[#8a9099]">
                カテゴリ
              </span>
              <select
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-lg bg-[#f2f3f5] text-[12.5px] font-medium text-[#3a3d42] cursor-pointer border-none outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトルを入力してください"
            className="w-full border border-black/[0.14] rounded-[10px] px-4 py-[13px] text-[22px] font-bold leading-[1.35] text-[#17181a] bg-white mb-[13px] outline-none focus:border-black/30"
          />

          {/* Header image */}
          <div className="mb-[22px]">
            <label className="block text-xs font-semibold text-[#5b6068] mb-[7px]">
              ヘッダー画像{" "}
              <span className="text-[#adb2ba] font-normal">· 記事一覧のサムネイルに使われます</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileInputChange}
            />
            {pendingHeader ? (
              <div className="relative rounded-[10px] overflow-hidden border border-black/[0.12]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingHeader.blobUrl}
                  alt="ヘッダー画像プレビュー"
                  className="w-full h-[200px] object-cover"
                />
                <button
                  onClick={() => {
                    URL.revokeObjectURL(pendingHeader.blobUrl);
                    setPendingHeader(null);
                  }}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/50 text-white text-xs font-medium hover:bg-black/70 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16"><line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.8"/><line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.8"/></svg>
                  削除
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-2 h-[120px] rounded-[10px] border border-dashed cursor-pointer transition-colors ${
                  isDragging
                    ? "border-[#1f8a54] bg-[#eef8f0]"
                    : "border-black/20 bg-[#fafafa] hover:bg-[#f2f3f5]"
                }`}
              >
                {isFetchingHeaderUrl ? (
                  <span className="text-xs text-[#8a9099]">準備中...</span>
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="4" width="20" height="16" rx="3" stroke="#c2c6cc" strokeWidth="1.4"/>
                      <circle cx="8" cy="9" r="1.8" fill="#c2c6cc"/>
                      <path d="M3 19 L8 13 L12 17 L15.5 13.5 L21 19" stroke="#c2c6cc" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-xs text-[#8a9099]">
                      クリックまたはドラッグ＆ドロップで画像を追加
                    </span>
                    <span className="text-[11px] text-[#c2c6cc]">JPEG · PNG · WebP · GIF</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mb-[22px]">
            <label className="block text-xs font-semibold text-[#5b6068] mb-[7px]">
              要約{" "}
              <span className="text-[#adb2ba] font-normal">
                · 一覧やSNSで表示されます
              </span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="記事の要約を入力してください"
              className="w-full border border-black/[0.12] rounded-[10px] px-[14px] py-[11px] text-[13.5px] leading-[1.65] text-[#4a4d52] bg-white resize-none outline-none focus:border-black/30"
            />
          </div>

          {/* Editor tabs */}
          <div className="flex items-center gap-0.5 border-b border-black/[0.11]">
            <button
              onClick={() => setActiveTab("write")}
              className={`px-4 py-[9px] text-[13px] rounded-t-[9px] relative top-px transition-colors ${
                activeTab === "write"
                  ? "bg-white border border-black/[0.11] border-b-white text-[#17181a] font-semibold"
                  : "text-[#8a9099] font-medium hover:text-[#5b6068]"
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-[9px] text-[13px] rounded-t-[9px] relative top-px transition-colors ${
                activeTab === "preview"
                  ? "bg-white border border-black/[0.11] border-b-white text-[#17181a] font-semibold"
                  : "text-[#8a9099] font-medium hover:text-[#5b6068]"
              }`}
            >
              Preview
            </button>
            <span className="ml-auto pb-[7px] text-[11px] text-[#adb2ba]">
              Markdown対応
            </span>
          </div>

          {/* Editor box */}
          <div className="border border-black/[0.11] border-t-0 rounded-b-[11px] bg-white">
            {activeTab === "write" && (
              <>
                {/* Toolbar */}
                <div className="flex items-center gap-px px-[9px] py-[7px] border-b border-black/[0.08]">
                  <ToolbarBtn
                    title="見出し"
                    onClick={() => insertMarkdown("## ")}
                    style={{
                      fontWeight: 700,
                      fontFamily: "'Noto Sans JP', sans-serif",
                    }}
                  >
                    H
                  </ToolbarBtn>
                  <ToolbarBtn
                    title="太字"
                    onClick={() => insertMarkdown("**", "**")}
                    style={{ fontWeight: 700, fontFamily: "Georgia, serif" }}
                  >
                    B
                  </ToolbarBtn>
                  <ToolbarBtn
                    title="斜体"
                    onClick={() => insertMarkdown("*", "*")}
                    style={{
                      fontStyle: "italic",
                      fontWeight: 600,
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    I
                  </ToolbarBtn>
                  <ToolbarBtn
                    title="打ち消し線"
                    onClick={() => insertMarkdown("~~", "~~")}
                    style={{
                      fontWeight: 600,
                      textDecoration: "line-through",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    S
                  </ToolbarBtn>

                  <span className="w-px h-4 bg-black/10 mx-[5px]" />

                  <ToolbarBtn
                    title="引用"
                    onClick={() => insertMarkdown("> ")}
                    style={{
                      fontWeight: 700,
                      fontFamily: "Georgia, serif",
                      fontSize: 15,
                    }}
                  >
                    &#8220;
                  </ToolbarBtn>
                  <ToolbarBtn
                    title="コード"
                    onClick={() => insertMarkdown("`", "`")}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    &lt;/&gt;
                  </ToolbarBtn>
                  <ToolbarBtn
                    title="リンク"
                    onClick={() => insertMarkdown("[", "](url)")}
                  >
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
                  </ToolbarBtn>
                  <ToolbarBtn
                    title="リスト"
                    onClick={() => insertMarkdown("- ")}
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16">
                      <circle cx="2.5" cy="4" r="1.2" fill="#5b6068" />
                      <circle cx="2.5" cy="8" r="1.2" fill="#5b6068" />
                      <circle cx="2.5" cy="12" r="1.2" fill="#5b6068" />
                      <line
                        x1="6"
                        y1="4"
                        x2="14"
                        y2="4"
                        stroke="#5b6068"
                        strokeWidth="1.4"
                      />
                      <line
                        x1="6"
                        y1="8"
                        x2="14"
                        y2="8"
                        stroke="#5b6068"
                        strokeWidth="1.4"
                      />
                      <line
                        x1="6"
                        y1="12"
                        x2="14"
                        y2="12"
                        stroke="#5b6068"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </ToolbarBtn>
                  <ToolbarBtn title="画像">
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
                  </ToolbarBtn>
                  <span
                    className="ml-auto text-[11px] text-[#c2c6cc] pr-1.5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {body.length.toLocaleString()} 文字
                  </span>
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onPaste={handlePasteImage}
                  placeholder="Markdownで本文を入力してください..."
                  className="w-full min-h-[296px] px-5 py-[18px] text-[13px] leading-[1.9] text-[#2b2f36] bg-transparent resize-y outline-none"
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                />
              </>
            )}

            {activeTab === "preview" && (
              <div className="px-5 py-[18px] min-h-[296px] prose prose-neutral [&_ul>li::marker]:text-black max-w-none">
                {body ? (
                  <ReactMarkdown
                    urlTransform={(url) => url}
                    components={{ img: MarkdownImg }}
                  >
                    {body}
                  </ReactMarkdown>
                ) : (
                  <p className="text-[#adb2ba] text-sm">
                    プレビューするコンテンツがありません。
                  </p>
                )}
              </div>
            )}

            {/* Editor footer */}
            <div className="flex items-center justify-between px-[15px] py-[9px] border-t border-black/[0.07] text-[11.5px] text-[#adb2ba]">
              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 16 16">
                  <path
                    d="M2 5h12M2 8h12M2 11h7"
                    stroke="#c2c6cc"
                    strokeWidth="1.4"
                  />
                </svg>
                Markdownがサポートされています
              </span>
              <span>画像はドラッグ＆ドロップで添付</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 mt-[22px] pt-5 border-t border-black/[0.08]">
            <span className="text-xs text-[#adb2ba]">
              公開すると一覧に表示されます
            </span>
            <button
              onClick={() => handleSubmit("draft")}
              disabled={isSubmitting}
              className="ml-auto px-[18px] py-[9px] border border-black/[0.16] bg-white rounded-[9px] text-[13px] font-semibold text-[#2c2f34] cursor-pointer hover:bg-[#f2f3f5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下書き保存
            </button>
            <button
              onClick={() => handleSubmit("published")}
              disabled={isSubmitting}
              className="px-[22px] py-[9px] bg-[#1f8a54] rounded-[9px] text-[13px] font-semibold text-white cursor-pointer shadow-[0_1px_2px_rgba(31,138,84,0.4)] hover:bg-[#1a7a49] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              公開する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownImg({ src, alt }: React.ImgHTMLAttributes<HTMLImageElement>) {
  if (!src || typeof src !== "string") return null;
  // blob: URL を含む任意のスキームを表示するため next/image ではなく img を使用
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? ""} className="max-w-full rounded" />;
}

function ToolbarBtn({
  children,
  onClick,
  title,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[31px] h-[29px] flex items-center justify-center rounded-[7px] text-[14px] text-[#5b6068] hover:bg-[#f2f3f5] transition-colors"
      style={style}
    >
      {children}
    </button>
  );
}
