export interface CategoryColorTheme {
  bg: string;
  text: string;
  icon: string;
  hoverBg: string;
  /** pixel-fill-2 と組み合わせて、地と枠を同じ色で塗る（bg と同じ色） */
  fill: string;
  /** fill のホバー時の色（hoverBg と同じ色） */
  hoverFill: string;
}

export interface TagColorTheme {
  text: string;
  dot: string;
  /** pixel-fill-2 と組み合わせて、地と枠を同じ色で塗る */
  fill: string;
  hoverFill: string;
}

export const CATEGORY_COLORS: Record<number, CategoryColorTheme> = {
  1: {
    bg: "bg-[#eef4fb]",
    text: "text-[#2c5aa0]",
    icon: "text-[#4a9ee0]",
    hoverBg: "hover:bg-[#e2edfa]",
    fill: "[--pixel-c:#eef4fb]",
    hoverFill: "hover:[--pixel-c:#e2edfa]",
  }, // 技術
  2: {
    bg: "bg-[#fbf6ea]",
    text: "text-[#9a6a12]",
    icon: "text-[#d9a53c]",
    hoverBg: "hover:bg-[#f6eeda]",
    fill: "[--pixel-c:#fbf6ea]",
    hoverFill: "hover:[--pixel-c:#f6eeda]",
  }, // 趣味
  3: {
    bg: "bg-[#f3effb]",
    text: "text-[#5a45a0]",
    icon: "text-[#8a6ad6]",
    hoverBg: "hover:bg-[#ece5f8]",
    fill: "[--pixel-c:#f3effb]",
    hoverFill: "hover:[--pixel-c:#ece5f8]",
  }, // ビジネス
};

export const CATEGORY_DEFAULT_COLOR: CategoryColorTheme = {
  bg: "bg-[#eef0f2]",
  text: "text-[#5b6068]",
  icon: "text-[#8a9099]",
  hoverBg: "hover:bg-[#e4e6e9]",
  fill: "[--pixel-c:#eef0f2]",
  hoverFill: "hover:[--pixel-c:#e4e6e9]",
}; // その他・未知のカテゴリ

export const TAG_COLOR: TagColorTheme = {
  text: "text-black",
  dot: "bg-gray-500",
  fill: "[--pixel-c:var(--color-gray-200)]",
  hoverFill: "hover:[--pixel-c:var(--color-gray-300)]",
};
