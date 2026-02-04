import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "../../db/client";
import { mediaFolders, scrapingSettings, organizingSettings } from "../../db/schema";
import type {
  CreateMediaFolderInput,
  UpdateMediaFolderInput,
  UpdateScrapingSettingsInput,
  UpdateOrganizingSettingsInput,
  ContentType,
  LinkMode
} from "@acme/types";

// 转换媒体文件夹实体为 API 输出
export const toMediaFolderOutput = (folder: typeof mediaFolders.$inferSelect) => ({
  id: folder.id,
  contentType: folder.contentType as ContentType,
  downloadPath: folder.downloadPath,
  containerPath: folder.containerPath ?? null,
  targetPath: folder.targetPath,
  linkMode: folder.linkMode as LinkMode,
  autoCategory: folder.autoCategory,
  sortOrder: folder.sortOrder,
  createdAt: folder.createdAt!.toISOString(),
  updatedAt: folder.updatedAt!.toISOString()
});

// 转换刮削设置实体为 API 输出
export const toScrapingSettingsOutput = (settings: typeof scrapingSettings.$inferSelect) => ({
  id: settings.id,
  generateNfo: settings.generateNfo,
  downloadImages: settings.downloadImages,
  useChineseInfo: settings.useChineseInfo,
  movieImageSources: settings.movieImageSources ?? null,
  tvImageSources: settings.tvImageSources ?? null,
  imageLanguagePriority: settings.imageLanguagePriority ?? null,
  useHdPoster: settings.useHdPoster,
  useHdBackdrop: settings.useHdBackdrop,
  createdAt: settings.createdAt!.toISOString(),
  updatedAt: settings.updatedAt!.toISOString()
});

// 转换整理设置实体为 API 输出
export const toOrganizingSettingsOutput = (settings: typeof organizingSettings.$inferSelect) => ({
  id: settings.id,
  defaultLinkMode: settings.defaultLinkMode as LinkMode,
  movieFileFormat: settings.movieFileFormat,
  movieFolderFormat: settings.movieFolderFormat,
  tvFileFormat: settings.tvFileFormat,
  tvFolderFormat: settings.tvFolderFormat,
  flattenDisc: settings.flattenDisc,
  fixEmbyDisc: settings.fixEmbyDisc,
  enableRecognition: settings.enableRecognition,
  strictYearMatch: settings.strictYearMatch,
  unknownToFolder: settings.unknownToFolder,
  createdAt: settings.createdAt!.toISOString(),
  updatedAt: settings.updatedAt!.toISOString()
});

export class MediaFolderService {
  // ==================== 媒体文件夹 ====================

  // 获取所有媒体文件夹
  async listFolders() {
    const folders = await db
      .select()
      .from(mediaFolders)
      .orderBy(asc(mediaFolders.sortOrder), asc(mediaFolders.createdAt));
    return folders;
  }

  // 根据内容类型获取文件夹
  async listFoldersByType(contentType: string) {
    const folders = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.contentType, contentType))
      .orderBy(asc(mediaFolders.sortOrder));
    return folders;
  }

  // 根据 ID 获取单个文件夹
  async getFolderById(id: string) {
    const [folder] = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.id, id))
      .limit(1);
    return folder ?? null;
  }

  // 创建媒体文件夹
  async createFolder(input: CreateMediaFolderInput) {
    const [created] = await db
      .insert(mediaFolders)
      .values({
        contentType: input.contentType,
        downloadPath: input.downloadPath,
        containerPath: input.containerPath,
        targetPath: input.targetPath,
        linkMode: input.linkMode,
        autoCategory: input.autoCategory,
        sortOrder: input.sortOrder ?? "0"
      })
      .returning();

    return created;
  }

  // 更新媒体文件夹
  async updateFolder(input: UpdateMediaFolderInput) {
    const existing = await this.getFolderById(input.id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体文件夹不存在"
      });
    }

    const [updated] = await db
      .update(mediaFolders)
      .set({
        ...(input.contentType !== undefined && { contentType: input.contentType }),
        ...(input.downloadPath !== undefined && { downloadPath: input.downloadPath }),
        ...(input.containerPath !== undefined && { containerPath: input.containerPath }),
        ...(input.targetPath !== undefined && { targetPath: input.targetPath }),
        ...(input.linkMode !== undefined && { linkMode: input.linkMode }),
        ...(input.autoCategory !== undefined && { autoCategory: input.autoCategory }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        updatedAt: new Date()
      })
      .where(eq(mediaFolders.id, input.id))
      .returning();

    return updated;
  }

  // 删除媒体文件夹
  async deleteFolder(id: string) {
    const existing = await this.getFolderById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体文件夹不存在"
      });
    }

    await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
    return { success: true };
  }

  // ==================== 刮削设置 ====================

  // 获取刮削设置（单例）
  async getScrapingSettings() {
    const [settings] = await db.select().from(scrapingSettings).limit(1);

    // 如果不存在则创建默认设置
    if (!settings) {
      const [created] = await db
        .insert(scrapingSettings)
        .values({
          generateNfo: true,
          downloadImages: true,
          useChineseInfo: false,
          movieImageSources: ["FanArt", "TheMovieDB"],
          tvImageSources: ["FanArt", "TheMovieDB"],
          imageLanguagePriority: ["zh", "en"],
          useHdPoster: true,
          useHdBackdrop: false
        })
        .returning();
      return created;
    }

    return settings;
  }

  // 更新刮削设置
  async updateScrapingSettings(input: UpdateScrapingSettingsInput) {
    const existing = await this.getScrapingSettings();

    const [updated] = await db
      .update(scrapingSettings)
      .set({
        ...(input.generateNfo !== undefined && { generateNfo: input.generateNfo }),
        ...(input.downloadImages !== undefined && { downloadImages: input.downloadImages }),
        ...(input.useChineseInfo !== undefined && { useChineseInfo: input.useChineseInfo }),
        ...(input.movieImageSources !== undefined && { movieImageSources: input.movieImageSources }),
        ...(input.tvImageSources !== undefined && { tvImageSources: input.tvImageSources }),
        ...(input.imageLanguagePriority !== undefined && { imageLanguagePriority: input.imageLanguagePriority }),
        ...(input.useHdPoster !== undefined && { useHdPoster: input.useHdPoster }),
        ...(input.useHdBackdrop !== undefined && { useHdBackdrop: input.useHdBackdrop }),
        updatedAt: new Date()
      })
      .where(eq(scrapingSettings.id, existing.id))
      .returning();

    return updated;
  }

  // ==================== 整理设置 ====================

  // 获取整理设置（单例）
  async getOrganizingSettings() {
    const [settings] = await db.select().from(organizingSettings).limit(1);

    // 如果不存在则创建默认设置
    if (!settings) {
      const [created] = await db
        .insert(organizingSettings)
        .values({
          defaultLinkMode: "hardlink",
          movieFileFormat: "{{name}} ({{year}}){% if version %} - {{version}}{% endif %}",
          movieFolderFormat: "{{name}} ({{year}})",
          tvFileFormat: "{{name}} S{{season}}E{{ep_start}}{% if ep_end %}-E{{ep_end}}{% endif %}{% if version %} - {{version}}{% endif %}",
          tvFolderFormat: "{{name}} ({{year}})",
          flattenDisc: false,
          fixEmbyDisc: false,
          enableRecognition: true,
          strictYearMatch: false,
          unknownToFolder: true
        })
        .returning();
      return created;
    }

    return settings;
  }

  // 更新整理设置
  async updateOrganizingSettings(input: UpdateOrganizingSettingsInput) {
    const existing = await this.getOrganizingSettings();

    const [updated] = await db
      .update(organizingSettings)
      .set({
        ...(input.defaultLinkMode !== undefined && { defaultLinkMode: input.defaultLinkMode }),
        ...(input.movieFileFormat !== undefined && { movieFileFormat: input.movieFileFormat }),
        ...(input.movieFolderFormat !== undefined && { movieFolderFormat: input.movieFolderFormat }),
        ...(input.tvFileFormat !== undefined && { tvFileFormat: input.tvFileFormat }),
        ...(input.tvFolderFormat !== undefined && { tvFolderFormat: input.tvFolderFormat }),
        ...(input.flattenDisc !== undefined && { flattenDisc: input.flattenDisc }),
        ...(input.fixEmbyDisc !== undefined && { fixEmbyDisc: input.fixEmbyDisc }),
        ...(input.enableRecognition !== undefined && { enableRecognition: input.enableRecognition }),
        ...(input.strictYearMatch !== undefined && { strictYearMatch: input.strictYearMatch }),
        ...(input.unknownToFolder !== undefined && { unknownToFolder: input.unknownToFolder }),
        updatedAt: new Date()
      })
      .where(eq(organizingSettings.id, existing.id))
      .returning();

    return updated;
  }
}

export const mediaFolderService = new MediaFolderService();
