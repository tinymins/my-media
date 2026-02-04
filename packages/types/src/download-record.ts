import { z } from "zod";

// 下载记录状态
export const DownloadRecordStatusSchema = z.enum([
  "downloading",
  "seeding",
  "completed",
  "failed",
  "organizing",
  "organized"
]);

export type DownloadRecordStatus = z.infer<typeof DownloadRecordStatusSchema>;

// 下载记录
export const DownloadRecordSchema = z.object({
  id: z.string(),
  torrentName: z.string(),
  torrentHash: z.string().nullable().optional(),
  contentType: z.string(), // movie, tv
  mediaTitle: z.string().nullable().optional(),
  mediaYear: z.string().nullable().optional(),
  tmdbId: z.string().nullable().optional(),
  imdbId: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  episode: z.string().nullable().optional(),
  quality: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  codec: z.string().nullable().optional(),
  releaseGroup: z.string().nullable().optional(),
  ptSiteId: z.string().nullable().optional(),
  ptSiteName: z.string().optional(), // 来源站点名称（联表查询）
  downloadClientId: z.string().nullable().optional(),
  downloadPath: z.string().nullable().optional(),
  targetPath: z.string().nullable().optional(),
  fileSize: z.string().nullable().optional(),
  status: DownloadRecordStatusSchema,
  progress: z.string().nullable().optional(),
  uploadedSize: z.string().nullable().optional(),
  downloadedSize: z.string().nullable().optional(),
  ratio: z.string().nullable().optional(),
  seedingTime: z.string().nullable().optional(),
  isRecognized: z.boolean(),
  createdBy: z.string().nullable().optional(),
  createdByName: z.string().optional(), // 创建者名称（联表查询）
  createdAt: z.string(),
  updatedAt: z.string()
});

export type DownloadRecord = z.infer<typeof DownloadRecordSchema>;

// 创建下载记录输入
export const CreateDownloadRecordInputSchema = z.object({
  torrentName: z.string().min(1),
  torrentHash: z.string().optional(),
  contentType: z.string(),
  mediaTitle: z.string().optional(),
  mediaYear: z.string().optional(),
  tmdbId: z.string().optional(),
  imdbId: z.string().optional(),
  season: z.string().optional(),
  episode: z.string().optional(),
  quality: z.string().optional(),
  source: z.string().optional(),
  codec: z.string().optional(),
  releaseGroup: z.string().optional(),
  ptSiteId: z.string().optional(),
  downloadClientId: z.string().optional(),
  downloadPath: z.string().optional(),
  fileSize: z.string().optional()
});

export type CreateDownloadRecordInput = z.infer<typeof CreateDownloadRecordInputSchema>;

// 更新下载记录输入
export const UpdateDownloadRecordInputSchema = z.object({
  id: z.string(),
  mediaTitle: z.string().optional(),
  mediaYear: z.string().optional(),
  tmdbId: z.string().optional(),
  imdbId: z.string().optional(),
  season: z.string().optional(),
  episode: z.string().optional(),
  targetPath: z.string().optional(),
  status: DownloadRecordStatusSchema.optional(),
  progress: z.string().optional(),
  uploadedSize: z.string().optional(),
  downloadedSize: z.string().optional(),
  ratio: z.string().optional(),
  seedingTime: z.string().optional(),
  isRecognized: z.boolean().optional()
});

export type UpdateDownloadRecordInput = z.infer<typeof UpdateDownloadRecordInputSchema>;

// 下载记录查询参数
export const DownloadRecordQuerySchema = z.object({
  status: DownloadRecordStatusSchema.optional(),
  contentType: z.string().optional(),
  isRecognized: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export type DownloadRecordQuery = z.infer<typeof DownloadRecordQuerySchema>;
