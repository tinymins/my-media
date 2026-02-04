import { z } from "zod";

// 下载客户端类型
export const DownloadClientTypeSchema = z.enum(["qbittorrent", "transmission", "aria2"]);
export type DownloadClientType = z.infer<typeof DownloadClientTypeSchema>;

// 下载客户端配置
export const DownloadClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: DownloadClientTypeSchema,
  url: z.string(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  downloadPath: z.string().nullable().optional(),
  isDefault: z.boolean(),
  requireAuth: z.boolean(),
  monitorEnabled: z.boolean(),
  isEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type DownloadClient = z.infer<typeof DownloadClientSchema>;

// 创建下载客户端输入
export const CreateDownloadClientInputSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  type: DownloadClientTypeSchema,
  url: z.string().url("请输入有效的访问地址"),
  username: z.string().optional(),
  password: z.string().optional(),
  downloadPath: z.string().optional(),
  isDefault: z.boolean().default(false),
  requireAuth: z.boolean().default(true),
  monitorEnabled: z.boolean().default(false),
  isEnabled: z.boolean().default(true)
});

export type CreateDownloadClientInput = z.infer<typeof CreateDownloadClientInputSchema>;

// 更新下载客户端输入
export const UpdateDownloadClientInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  type: DownloadClientTypeSchema.optional(),
  url: z.string().url().optional(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  downloadPath: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  requireAuth: z.boolean().optional(),
  monitorEnabled: z.boolean().optional(),
  isEnabled: z.boolean().optional()
});

export type UpdateDownloadClientInput = z.infer<typeof UpdateDownloadClientInputSchema>;

// 下载任务状态
export const TorrentStateSchema = z.enum([
  "downloading",
  "seeding",
  "pausedDL",
  "pausedUP",
  "stalledDL",
  "stalledUP",
  "checkingDL",
  "checkingUP",
  "queuedDL",
  "queuedUP",
  "error",
  "missingFiles",
  "uploading",
  "completed",
  "unknown"
]);

export type TorrentState = z.infer<typeof TorrentStateSchema>;

// 下载任务信息
export const TorrentInfoSchema = z.object({
  hash: z.string(),
  name: z.string(),
  size: z.number(), // 字节
  progress: z.number(), // 0-1
  downloadSpeed: z.number(), // 字节/秒
  uploadSpeed: z.number(), // 字节/秒
  downloaded: z.number(), // 已下载字节
  uploaded: z.number(), // 已上传字节
  ratio: z.number(), // 分享率
  state: TorrentStateSchema,
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  savePath: z.string(),
  addedOn: z.number(), // Unix 时间戳
  completedOn: z.number().optional(), // 完成时间
  seedingTime: z.number(), // 做种时间（秒）
  eta: z.number().optional(), // 预计剩余时间（秒）
  numSeeds: z.number().optional(),
  numLeeches: z.number().optional(),
  tracker: z.string().optional()
});

export type TorrentInfo = z.infer<typeof TorrentInfoSchema>;

// 添加种子输入
export const AddTorrentInputSchema = z.object({
  clientId: z.string(),
  urls: z.array(z.string()).optional(), // 种子 URL 或磁力链接
  torrents: z.array(z.string()).optional(), // Base64 编码的种子文件
  savePath: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  paused: z.boolean().optional(),
  skipHashCheck: z.boolean().optional()
});

export type AddTorrentInput = z.infer<typeof AddTorrentInputSchema>;

// 下载客户端状态
export const DownloadClientStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: DownloadClientTypeSchema,
  isConnected: z.boolean(),
  version: z.string().optional(),
  freeSpace: z.number().optional(), // 可用空间（字节）
  totalDownloading: z.number().optional(),
  totalSeeding: z.number().optional(),
  downloadSpeed: z.number().optional(), // 全局下载速度
  uploadSpeed: z.number().optional(), // 全局上传速度
  errorMessage: z.string().optional()
});

export type DownloadClientStatus = z.infer<typeof DownloadClientStatusSchema>;
