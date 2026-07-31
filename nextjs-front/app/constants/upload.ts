export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_FILE_SIZE_LABEL = "5MB";

// input[accept]属性とファイル種別バリデーションの両方でこの一覧を共有する。
// image/svg+xmlはスクリプト埋め込みが可能なため意図的に含めない
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const ALLOWED_IMAGE_TYPES_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");
