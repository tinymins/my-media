import { z } from "zod";
import {
  MediaServerSchema,
  CreateMediaServerInputSchema,
  UpdateMediaServerInputSchema,
  MediaServerStatusSchema,
  MediaLibrarySchema,
  MediaItemSchema
} from "@acme/types";
import { Router, Query, Mutation, UseMiddlewares } from "../../trpc/decorators";
import { requireUser, requireAdmin } from "../../trpc/middlewares";
import { mediaServerService, toMediaServerOutput } from "./media-server.service";

@Router({ alias: "mediaServer" })
export class MediaServerRouter {
  // 获取所有媒体服务器列表
  @Query({ output: z.array(MediaServerSchema) })
  @UseMiddlewares(requireUser)
  async list() {
    const servers = await mediaServerService.list();
    return servers.map(toMediaServerOutput);
  }

  // 获取单个媒体服务器详情
  @Query({
    input: z.object({ id: z.string() }),
    output: MediaServerSchema.nullable()
  })
  @UseMiddlewares(requireUser)
  async getById(input: { id: string }) {
    const server = await mediaServerService.getById(input.id);
    return server ? toMediaServerOutput(server) : null;
  }

  // 获取主要媒体服务器
  @Query({ output: MediaServerSchema.nullable() })
  @UseMiddlewares(requireUser)
  async getPrimary() {
    const server = await mediaServerService.getPrimary();
    return server ? toMediaServerOutput(server) : null;
  }

  // 创建媒体服务器（管理员）
  @Mutation({
    input: CreateMediaServerInputSchema,
    output: MediaServerSchema
  })
  @UseMiddlewares(requireAdmin)
  async create(input: z.infer<typeof CreateMediaServerInputSchema>) {
    const created = await mediaServerService.create(input);
    return toMediaServerOutput(created);
  }

  // 更新媒体服务器（管理员）
  @Mutation({
    input: UpdateMediaServerInputSchema,
    output: MediaServerSchema
  })
  @UseMiddlewares(requireAdmin)
  async update(input: z.infer<typeof UpdateMediaServerInputSchema>) {
    const updated = await mediaServerService.update(input);
    return toMediaServerOutput(updated);
  }

  // 删除媒体服务器（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireAdmin)
  async delete(input: { id: string }) {
    return await mediaServerService.delete(input.id);
  }

  // 切换启用状态（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: MediaServerSchema
  })
  @UseMiddlewares(requireAdmin)
  async toggleEnabled(input: { id: string }) {
    const updated = await mediaServerService.toggleEnabled(input.id);
    return toMediaServerOutput(updated);
  }

  // 设置为主要服务器（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: MediaServerSchema
  })
  @UseMiddlewares(requireAdmin)
  async setPrimary(input: { id: string }) {
    const updated = await mediaServerService.setPrimary(input.id);
    return toMediaServerOutput(updated);
  }

  // ========== API 集成端点 ==========

  // 测试连接
  @Query({
    input: z.object({ id: z.string() }),
    output: MediaServerStatusSchema
  })
  @UseMiddlewares(requireUser)
  async testConnection(input: { id: string }) {
    return mediaServerService.testConnection(input.id);
  }

  // 获取所有服务器状态
  @Query({ output: z.array(MediaServerStatusSchema) })
  @UseMiddlewares(requireUser)
  async getAllStatus() {
    return mediaServerService.getAllStatus();
  }

  // 获取媒体库列表
  @Query({
    input: z.object({ id: z.string() }),
    output: z.array(MediaLibrarySchema)
  })
  @UseMiddlewares(requireUser)
  async getLibraries(input: { id: string }) {
    return mediaServerService.getLibraries(input.id);
  }

  // 搜索媒体
  @Query({
    input: z.object({ id: z.string(), query: z.string() }),
    output: z.array(MediaItemSchema)
  })
  @UseMiddlewares(requireUser)
  async searchMedia(input: { id: string; query: string }) {
    return mediaServerService.searchMedia(input.id, input.query);
  }

  // 刷新媒体库
  @Mutation({
    input: z.object({ id: z.string(), libraryKey: z.string() }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireUser)
  async refreshLibrary(input: { id: string; libraryKey: string }) {
    await mediaServerService.refreshLibrary(input.id, input.libraryKey);
    return { success: true };
  }
}
