import { z } from "zod";

// 内容类型
export const ContentTypeSchema = z.enum(["movie", "tv", "anime", "music"]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

// 链接模式
export const LinkModeSchema = z.enum(["hardlink", "softlink", "copy", "move"]);
export type LinkMode = z.infer<typeof LinkModeSchema>;

// 媒体文件夹配置
export const MediaFolderSchema = z.object({
  id: z.string(),
  contentType: ContentTypeSchema,
  downloadPath: z.string(),
  containerPath: z.string().nullable().optional(),
  targetPath: z.string(),
  linkMode: LinkModeSchema,
  autoCategory: z.boolean(),
  sortOrder: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type MediaFolder = z.infer<typeof MediaFolderSchema>;

// 创建媒体文件夹输入
export const CreateMediaFolderInputSchema = z.object({
  contentType: ContentTypeSchema,
  downloadPath: z.string().min(1, "下载保存路径不能为空"),
  containerPath: z.string().optional(),
  targetPath: z.string().min(1, "整理目标路径不能为空"),
  linkMode: LinkModeSchema.default("hardlink"),
  autoCategory: z.boolean().default(false),
  sortOrder: z.string().optional()
});

export type CreateMediaFolderInput = z.infer<typeof CreateMediaFolderInputSchema>;

// 更新媒体文件夹输入
export const UpdateMediaFolderInputSchema = z.object({
  id: z.string(),
  contentType: ContentTypeSchema.optional(),
  downloadPath: z.string().min(1).optional(),
  containerPath: z.string().nullable().optional(),
  targetPath: z.string().min(1).optional(),
  linkMode: LinkModeSchema.optional(),
  autoCategory: z.boolean().optional(),
  sortOrder: z.string().optional()
});

export type UpdateMediaFolderInput = z.infer<typeof UpdateMediaFolderInputSchema>;

// 刮削设置
export const ScrapingSettingsSchema = z.object({
  id: z.string(),
  generateNfo: z.boolean(),
  downloadImages: z.boolean(),
  useChineseInfo: z.boolean(),
  movieImageSources: z.array(z.string()).nullable().optional(),
  tvImageSources: z.array(z.string()).nullable().optional(),
  imageLanguagePriority: z.array(z.string()).nullable().optional(),
  useHdPoster: z.boolean(),
  useHdBackdrop: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ScrapingSettings = z.infer<typeof ScrapingSettingsSchema>;

// 更新刮削设置输入
export const UpdateScrapingSettingsInputSchema = z.object({
  generateNfo: z.boolean().optional(),
  downloadImages: z.boolean().optional(),
  useChineseInfo: z.boolean().optional(),
  movieImageSources: z.array(z.string()).optional(),
  tvImageSources: z.array(z.string()).optional(),
  imageLanguagePriority: z.array(z.string()).optional(),
  useHdPoster: z.boolean().optional(),
  useHdBackdrop: z.boolean().optional()
});

export type UpdateScrapingSettingsInput = z.infer<typeof UpdateScrapingSettingsInputSchema>;

// 整理设置
export const OrganizingSettingsSchema = z.object({
  id: z.string(),
  defaultLinkMode: LinkModeSchema,
  movieFileFormat: z.string(),
  movieFolderFormat: z.string(),
  tvFileFormat: z.string(),
  tvFolderFormat: z.string(),
  flattenDisc: z.boolean(),
  fixEmbyDisc: z.boolean(),
  enableRecognition: z.boolean(),
  strictYearMatch: z.boolean(),
  unknownToFolder: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type OrganizingSettings = z.infer<typeof OrganizingSettingsSchema>;

// 更新整理设置输入
export const UpdateOrganizingSettingsInputSchema = z.object({
  defaultLinkMode: LinkModeSchema.optional(),
  movieFileFormat: z.string().optional(),
  movieFolderFormat: z.string().optional(),
  tvFileFormat: z.string().optional(),
  tvFolderFormat: z.string().optional(),
  flattenDisc: z.boolean().optional(),
  fixEmbyDisc: z.boolean().optional(),
  enableRecognition: z.boolean().optional(),
  strictYearMatch: z.boolean().optional(),
  unknownToFolder: z.boolean().optional()
});

export type UpdateOrganizingSettingsInput = z.infer<typeof UpdateOrganizingSettingsInputSchema>;
