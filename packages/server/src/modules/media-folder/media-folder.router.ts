import { z } from "zod";
import {
  MediaFolderSchema,
  CreateMediaFolderInputSchema,
  UpdateMediaFolderInputSchema,
  ScrapingSettingsSchema,
  UpdateScrapingSettingsInputSchema,
  OrganizingSettingsSchema,
  UpdateOrganizingSettingsInputSchema
} from "@acme/types";
import { Router, Query, Mutation, UseMiddlewares } from "../../trpc/decorators";
import { requireUser, requireAdmin } from "../../trpc/middlewares";
import {
  mediaFolderService,
  toMediaFolderOutput,
  toScrapingSettingsOutput,
  toOrganizingSettingsOutput
} from "./media-folder.service";

@Router({ alias: "mediaFolder" })
export class MediaFolderRouter {
  // ==================== 媒体文件夹 ====================

  // 获取所有媒体文件夹列表
  @Query({ output: z.array(MediaFolderSchema) })
  @UseMiddlewares(requireUser)
  async listFolders() {
    const folders = await mediaFolderService.listFolders();
    return folders.map(toMediaFolderOutput);
  }

  // 获取单个媒体文件夹详情
  @Query({
    input: z.object({ id: z.string() }),
    output: MediaFolderSchema.nullable()
  })
  @UseMiddlewares(requireUser)
  async getFolderById(input: { id: string }) {
    const folder = await mediaFolderService.getFolderById(input.id);
    return folder ? toMediaFolderOutput(folder) : null;
  }

  // 创建媒体文件夹（管理员）
  @Mutation({
    input: CreateMediaFolderInputSchema,
    output: MediaFolderSchema
  })
  @UseMiddlewares(requireAdmin)
  async createFolder(input: z.infer<typeof CreateMediaFolderInputSchema>) {
    const created = await mediaFolderService.createFolder(input);
    return toMediaFolderOutput(created);
  }

  // 更新媒体文件夹（管理员）
  @Mutation({
    input: UpdateMediaFolderInputSchema,
    output: MediaFolderSchema
  })
  @UseMiddlewares(requireAdmin)
  async updateFolder(input: z.infer<typeof UpdateMediaFolderInputSchema>) {
    const updated = await mediaFolderService.updateFolder(input);
    return toMediaFolderOutput(updated);
  }

  // 删除媒体文件夹（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireAdmin)
  async deleteFolder(input: { id: string }) {
    return await mediaFolderService.deleteFolder(input.id);
  }

  // ==================== 刮削设置 ====================

  // 获取刮削设置
  @Query({ output: ScrapingSettingsSchema })
  @UseMiddlewares(requireUser)
  async getScrapingSettings() {
    const settings = await mediaFolderService.getScrapingSettings();
    return toScrapingSettingsOutput(settings);
  }

  // 更新刮削设置（管理员）
  @Mutation({
    input: UpdateScrapingSettingsInputSchema,
    output: ScrapingSettingsSchema
  })
  @UseMiddlewares(requireAdmin)
  async updateScrapingSettings(input: z.infer<typeof UpdateScrapingSettingsInputSchema>) {
    const updated = await mediaFolderService.updateScrapingSettings(input);
    return toScrapingSettingsOutput(updated);
  }

  // ==================== 整理设置 ====================

  // 获取整理设置
  @Query({ output: OrganizingSettingsSchema })
  @UseMiddlewares(requireUser)
  async getOrganizingSettings() {
    const settings = await mediaFolderService.getOrganizingSettings();
    return toOrganizingSettingsOutput(settings);
  }

  // 更新整理设置（管理员）
  @Mutation({
    input: UpdateOrganizingSettingsInputSchema,
    output: OrganizingSettingsSchema
  })
  @UseMiddlewares(requireAdmin)
  async updateOrganizingSettings(input: z.infer<typeof UpdateOrganizingSettingsInputSchema>) {
    const updated = await mediaFolderService.updateOrganizingSettings(input);
    return toOrganizingSettingsOutput(updated);
  }
}
