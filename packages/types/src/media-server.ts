import { z } from "zod";

// 媒体服务器类型
export const MediaServerTypeSchema = z.enum(["plex", "emby", "jellyfin"]);
export type MediaServerType = z.infer<typeof MediaServerTypeSchema>;

// 媒体服务器配置
export const MediaServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: MediaServerTypeSchema,
  url: z.string(),
  externalUrl: z.string().nullable().optional(),
  token: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
  isPrimary: z.boolean(),
  autoRefresh: z.boolean(),
  isEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type MediaServer = z.infer<typeof MediaServerSchema>;

// 创建媒体服务器输入
export const CreateMediaServerInputSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  type: MediaServerTypeSchema,
  url: z.string().url("请输入有效的访问地址"),
  externalUrl: z.string().url().optional(),
  token: z.string().optional(),
  apiKey: z.string().optional(),
  isPrimary: z.boolean().default(false),
  autoRefresh: z.boolean().default(false),
  isEnabled: z.boolean().default(true)
});

export type CreateMediaServerInput = z.infer<typeof CreateMediaServerInputSchema>;

// 更新媒体服务器输入
export const UpdateMediaServerInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  type: MediaServerTypeSchema.optional(),
  url: z.string().url().optional(),
  externalUrl: z.string().url().nullable().optional(),
  token: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  autoRefresh: z.boolean().optional(),
  isEnabled: z.boolean().optional()
});

export type UpdateMediaServerInput = z.infer<typeof UpdateMediaServerInputSchema>;

// 媒体库信息
export const MediaLibrarySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(), // movie, show, music, photo
  itemCount: z.number().optional()
});

export type MediaLibrary = z.infer<typeof MediaLibrarySchema>;

// 媒体项目（电影/剧集）
export const MediaItemSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  serverName: z.string(),
  title: z.string(),
  originalTitle: z.string().optional(),
  year: z.number().optional(),
  type: z.enum(["movie", "show", "episode", "season"]),
  posterUrl: z.string().optional(),
  backdropUrl: z.string().optional(),
  summary: z.string().optional(),
  rating: z.number().optional(),
  duration: z.number().optional(), // 时长（毫秒）
  resolution: z.string().optional(), // 4096x1710
  videoCodec: z.string().optional(), // hevc
  audioCodec: z.string().optional(), // eac3
  container: z.string().optional(), // mp4, mkv
  imdbId: z.string().optional(),
  tmdbId: z.string().optional(),
  addedAt: z.string().optional()
});

export type MediaItem = z.infer<typeof MediaItemSchema>;

// 媒体服务器状态
export const MediaServerStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: MediaServerTypeSchema,
  isConnected: z.boolean(),
  version: z.string().optional(),
  libraryCount: z.number().optional(),
  errorMessage: z.string().optional()
});

export type MediaServerStatus = z.infer<typeof MediaServerStatusSchema>;
