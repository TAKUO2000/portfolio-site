export interface Tag {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
}

export interface Category {
  id: number;
  name: string;
}

export interface PendingImage {
  blobUrl: string;
  file: File;
}
