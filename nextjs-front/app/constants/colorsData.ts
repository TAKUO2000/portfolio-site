export interface CategoryColorTheme {
  bg: string;
  text: string;
  icon: string;
  hoverBg: string;
}

export interface TagColorTheme {
  bg: string;
  text: string;
  dot: string;
  hoverBg: string;
}

export const CATEGORY_COLORS: Record<number, CategoryColorTheme> = {
  1: {
    bg: "bg-[#eef4fb]",
    text: "text-[#2c5aa0]",
    icon: "text-[#4a9ee0]",
    hoverBg: "hover:bg-[#e2edfa]",
  }, // 技術
  2: {
    bg: "bg-[#fbf6ea]",
    text: "text-[#9a6a12]",
    icon: "text-[#d9a53c]",
    hoverBg: "hover:bg-[#f6eeda]",
  }, // 趣味
  3: {
    bg: "bg-[#f3effb]",
    text: "text-[#5a45a0]",
    icon: "text-[#8a6ad6]",
    hoverBg: "hover:bg-[#ece5f8]",
  }, // ビジネス
};

export const CATEGORY_DEFAULT_COLOR: CategoryColorTheme = {
  bg: "bg-[#eef0f2]",
  text: "text-[#5b6068]",
  icon: "text-[#8a9099]",
  hoverBg: "hover:bg-[#e4e6e9]",
}; // その他・未知のカテゴリ

export const TAG_COLOR: TagColorTheme = {
  bg: "bg-[#eef0f2]",
  text: "text-[#5b6068]",
  dot: "bg-[#8a9099]",
  hoverBg: "hover:bg-[#e4e6e9]",
};
