import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "../../db/client";
import { mediaServers } from "../../db/schema";
import { PlexClient } from "../../lib/plex-client";
import type {
  CreateMediaServerInput,
  UpdateMediaServerInput,
  MediaServerType,
  MediaServerStatus,
  MediaLibrary,
  MediaItem
} from "@acme/types";

// 转换数据库实体为 API 输出
export const toMediaServerOutput = (server: typeof mediaServers.$inferSelect) => ({
  id: server.id,
  name: server.name,
  type: server.type as MediaServerType,
  url: server.url,
  externalUrl: server.externalUrl ?? null,
  token: server.token ?? null,
  apiKey: server.apiKey ?? null,
  isPrimary: server.isPrimary,
  autoRefresh: server.autoRefresh,
  isEnabled: server.isEnabled,
  createdAt: server.createdAt!.toISOString(),
  updatedAt: server.updatedAt!.toISOString()
});

export class MediaServerService {
  // 获取所有媒体服务器
  async list() {
    const servers = await db
      .select()
      .from(mediaServers)
      .orderBy(mediaServers.createdAt);
    return servers;
  }

  // 获取启用的媒体服务器
  async listEnabled() {
    const servers = await db
      .select()
      .from(mediaServers)
      .where(eq(mediaServers.isEnabled, true))
      .orderBy(mediaServers.createdAt);
    return servers;
  }

  // 获取主要媒体服务器
  async getPrimary() {
    const [server] = await db
      .select()
      .from(mediaServers)
      .where(eq(mediaServers.isPrimary, true))
      .limit(1);
    return server ?? null;
  }

  // 根据 ID 获取单个服务器
  async getById(id: string) {
    const [server] = await db
      .select()
      .from(mediaServers)
      .where(eq(mediaServers.id, id))
      .limit(1);
    return server ?? null;
  }

  // 创建媒体服务器
  async create(input: CreateMediaServerInput) {
    // 如果设置为主要服务器，先取消其他服务器的主要状态
    if (input.isPrimary) {
      await db
        .update(mediaServers)
        .set({ isPrimary: false, updatedAt: new Date() });
    }

    const [created] = await db
      .insert(mediaServers)
      .values({
        name: input.name,
        type: input.type,
        url: input.url,
        externalUrl: input.externalUrl,
        token: input.token,
        apiKey: input.apiKey,
        isPrimary: input.isPrimary,
        autoRefresh: input.autoRefresh,
        isEnabled: input.isEnabled
      })
      .returning();

    return created;
  }

  // 更新媒体服务器
  async update(input: UpdateMediaServerInput) {
    const existing = await this.getById(input.id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体服务器不存在"
      });
    }

    // 如果设置为主要服务器，先取消其他服务器的主要状态
    if (input.isPrimary) {
      await db
        .update(mediaServers)
        .set({ isPrimary: false, updatedAt: new Date() });
    }

    const [updated] = await db
      .update(mediaServers)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.externalUrl !== undefined && { externalUrl: input.externalUrl }),
        ...(input.token !== undefined && { token: input.token }),
        ...(input.apiKey !== undefined && { apiKey: input.apiKey }),
        ...(input.isPrimary !== undefined && { isPrimary: input.isPrimary }),
        ...(input.autoRefresh !== undefined && { autoRefresh: input.autoRefresh }),
        ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
        updatedAt: new Date()
      })
      .where(eq(mediaServers.id, input.id))
      .returning();

    return updated;
  }

  // 删除媒体服务器
  async delete(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体服务器不存在"
      });
    }

    await db.delete(mediaServers).where(eq(mediaServers.id, id));
    return { success: true };
  }

  // 切换启用状态
  async toggleEnabled(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体服务器不存在"
      });
    }

    const [updated] = await db
      .update(mediaServers)
      .set({
        isEnabled: !existing.isEnabled,
        updatedAt: new Date()
      })
      .where(eq(mediaServers.id, id))
      .returning();

    return updated;
  }

  // 设置为主要服务器
  async setPrimary(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体服务器不存在"
      });
    }

    // 取消所有其他服务器的主要状态
    await db
      .update(mediaServers)
      .set({ isPrimary: false, updatedAt: new Date() });

    // 设置当前服务器为主要
    const [updated] = await db
      .update(mediaServers)
      .set({
        isPrimary: true,
        updatedAt: new Date()
      })
      .where(eq(mediaServers.id, id))
      .returning();

    return updated;
  }

  // ========== API 集成方法 ==========

  // 创建客户端实例
  private createClient(server: typeof mediaServers.$inferSelect) {
    switch (server.type) {
      case "plex":
        if (!server.token) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Plex 服务器需要配置 Token"
          });
        }
        return new PlexClient({ url: server.url, token: server.token });
      case "emby":
      case "jellyfin":
        // TODO: 实现 Emby/Jellyfin 客户端
        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message: `${server.type} 客户端尚未实现`
        });
      default:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `不支持的媒体服务器类型: ${server.type}`
        });
    }
  }

  // 测试连接
  async testConnection(id: string): Promise<MediaServerStatus> {
    const server = await this.getById(id);
    if (!server) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体服务器不存在"
      });
    }

    try {
      const client = this.createClient(server);
      const status = await client.testConnection();
      return {
        ...status,
        id: server.id,
        name: server.name
      };
    } catch (error) {
      return {
        id: server.id,
        name: server.name,
        type: server.type as MediaServerType,
        isConnected: false,
        errorMessage: error instanceof Error ? error.message : "连接失败"
      };
    }
  }

  // 获取所有服务器的连接状态
  async getAllStatus(): Promise<MediaServerStatus[]> {
    const servers = await this.list();
    const statuses: MediaServerStatus[] = [];

    for (const server of servers) {
      try {
        const status = await this.testConnection(server.id);
        statuses.push(status);
      } catch (error) {
        statuses.push({
          id: server.id,
          name: server.name,
          type: server.type as MediaServerType,
          isConnected: false,
          errorMessage: error instanceof Error ? error.message : "连接失败"
        });
      }
    }

    return statuses;
  }

  // 获取媒体库列表
  async getLibraries(id: string): Promise<MediaLibrary[]> {
    const server = await this.getById(id);
    if (!server) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体服务器不存在"
      });
    }

    const client = this.createClient(server);
    return client.getLibraries();
  }

  // 搜索媒体
  async searchMedia(id: string, query: string): Promise<MediaItem[]> {
    const server = await this.getById(id);
    if (!server) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体服务器不存在"
      });
    }

    const client = this.createClient(server);
    const items = await client.search(query);
    // 填充服务器信息
    return items.map((item) => ({
      ...item,
      serverId: server.id,
      serverName: server.name
    }));
  }

  // 刷新媒体库
  async refreshLibrary(id: string, libraryKey: string): Promise<void> {
    const server = await this.getById(id);
    if (!server) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "媒体服务器不存在"
      });
    }

    const client = this.createClient(server);
    await client.refreshLibrary(libraryKey);
  }
}

export const mediaServerService = new MediaServerService();
