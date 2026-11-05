import type { ReactNode } from "react";

interface ComponentSectionDevProps {
  title: string;
  children: ReactNode;
  /** 中身の並べ方。横並び以外にしたいときだけ渡す */
  className?: string;
  /** 折りたたみ可能にする。MarkdownEditorのように縦に長いものへ使う */
  collapsible?: boolean;
  /** 折りたたみ可能なときの初期状態 */
  defaultOpen?: boolean;
}

export default function ComponentSectionDev({
  title,
  children,
  className = "flex gap-2",
  collapsible = false,
  defaultOpen = false,
}: ComponentSectionDevProps) {
  if (!collapsible) {
    return (
      <section>
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <div className={className}>{children}</div>
      </section>
    );
  }

  // 開閉はdetailsに任せる。stateを持たないぶんClient Componentにしなくて済む
  return (
    <section>
      <details open={defaultOpen} className="group">
        <summary className="mb-4 flex cursor-pointer list-none items-center gap-2">
          <span className="text-xs text-gray-500 transition-transform group-open:rotate-90">
            ▶
          </span>
          <h2 className="text-lg font-bold">{title}</h2>
        </summary>
        <div className={className}>{children}</div>
      </details>
    </section>
  );
}
