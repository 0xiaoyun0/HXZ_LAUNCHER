export interface Blueprint {
  id: string;
  uid: string;
  name: string;
  title: string;
  description: string;
  category: string;
  mc: string;
  loader: string;
  create_version: string;
  dependencies: string;
  cover: string;
  status: string;
  reason: string;
  downloads: number;
  size: number;
  filename: string;
  created: number;
  metadata: { dimensions?: number[]; blocks?: number; materials?: string[] };
}
export interface ForumPost {
  id: string;
  uid: string;
  name: string;
  title: string;
  body: string;
  category: string;
  created: number;
  updated: number;
  pinned: number;
  locked: number;
  hidden: number;
  likes: number;
  liked: boolean;
  replies: number;
}
export interface ForumReply {
  id: string;
  uid: string;
  name: string;
  body: string;
  created: number;
  parentId?: string | null;
  likes: number;
  liked: boolean;
}
export const blueprintCategories = [
  "生产与加工",
  "仓储与物流",
  "动力与传动",
  "列车与交通",
  "建筑与装饰",
  "其他"
];
export const forumCategories = ["交流讨论", "游戏求助", "作品分享", "建议反馈"];
export const statusLabels: Record<string, string> = {
  uploading: "文件未完成",
  pending: "待审核",
  approved: "已发布",
  rejected: "未通过"
};
export const jsonRequest = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
export function displayDate(value: number) {
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
export async function coverImage(file: File) {
  if (file.size > 8 * 1024 * 1024) throw Error("封面原图不能超过 8 MB");
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    let width = Math.min(768, image.width);
    for (;;) {
      canvas.width = width;
      canvas.height = Math.max(
        1,
        Math.round((image.height * width) / image.width)
      );
      if (canvas.height > 768) {
        canvas.width = Math.round((width * 768) / canvas.height);
        canvas.height = 768;
      }
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL("image/png");
      if (result.length <= 400000) return result;
      width = Math.floor(width / 2);
      if (width < 32) throw Error("封面过于复杂，请换一张图片");
    }
  } finally {
    image.close();
  }
}
