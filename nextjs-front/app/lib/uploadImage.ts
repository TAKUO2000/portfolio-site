"use client";

import {
  API_BASE_URL,
  getApiErrorMessage,
  getCsrfToken,
} from "@/app/auth/authClient";

export type UploadedImage = {
  // 記事保存時にAPIへ渡す一時キー（tmp/xxx.png）
  objectKey: string;
  // 本文中のプレビュー表示に使う一時キーのURL
  imageUrl: string;
};

// 送信直前に署名付きURLを取得してS3へPUTする。
// 選択・貼り付け時ではなく送信時に取得するのは、フォーム入力が長引いた場合の
// 署名付きURLの有効期限切れ（15分）を避けるため
export async function uploadImageToS3(file: File): Promise<UploadedImage> {
  const xsrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE_URL}/api/images/upload-url`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": xsrfToken,
    },
    body: JSON.stringify({
      file_name: file.name,
      media_type: file.type,
      file_size: file.size,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        response.status,
        data,
        "画像アップロードURLの取得に失敗しました。",
      ),
    );
  }

  const uploadRes = await fetch(data.upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("画像のアップロードに失敗しました。");
  }

  return { objectKey: data.object_key, imageUrl: data.image_url };
}
