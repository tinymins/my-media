import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "../../db/client";
import { downloadClients } from "../../db/schema";
import { QBittorrentClient } from "../../lib/qbittorrent-client";
import type {
  CreateDownloadClientInput,
  UpdateDownloadClientInput,
  DownloadClientType,
  DownloadClientStatus,
  TorrentInfo
} from "@acme/types";

// 转换数据库实体为 API 输出
export const toDownloadClientOutput = (client: typeof downloadClients.$inferSelect) => ({
  id: client.id,
  name: client.name,
  type: client.type as DownloadClientType,
  url: client.url,
  username: client.username ?? null,
  password: client.password ?? null,
  downloadPath: client.downloadPath ?? null,
  isDefault: client.isDefault,
  requireAuth: client.requireAuth,
  monitorEnabled: client.monitorEnabled,
  isEnabled: client.isEnabled,
  createdAt: client.createdAt!.toISOString(),
  updatedAt: client.updatedAt!.toISOString()
});

export class DownloadClientService {
  // 获取所有下载客户端
  async list() {
    const clients = await db
      .select()
      .from(downloadClients)
      .orderBy(downloadClients.createdAt);
    return clients;
  }

  // 获取启用的下载客户端
  async listEnabled() {
    const clients = await db
      .select()
      .from(downloadClients)
      .where(eq(downloadClients.isEnabled, true))
      .orderBy(downloadClients.createdAt);
    return clients;
  }

  // 获取默认下载客户端
  async getDefault() {
    const [client] = await db
      .select()
      .from(downloadClients)
      .where(eq(downloadClients.isDefault, true))
      .limit(1);
    return client ?? null;
  }

  // 根据 ID 获取单个客户端
  async getById(id: string) {
    const [client] = await db
      .select()
      .from(downloadClients)
      .where(eq(downloadClients.id, id))
      .limit(1);
    return client ?? null;
  }

  // 创建下载客户端
  async create(input: CreateDownloadClientInput) {
    // 如果设置为默认客户端，先取消其他客户端的默认状态
    if (input.isDefault) {
      await db
        .update(downloadClients)
        .set({ isDefault: false, updatedAt: new Date() });
    }

    const [created] = await db
      .insert(downloadClients)
      .values({
        name: input.name,
        type: input.type,
        url: input.url,
        username: input.username,
        password: input.password,
        downloadPath: input.downloadPath,
        isDefault: input.isDefault,
        requireAuth: input.requireAuth,
        monitorEnabled: input.monitorEnabled,
        isEnabled: input.isEnabled
      })
      .returning();

    return created;
  }

  // 更新下载客户端
  async update(input: UpdateDownloadClientInput) {
    const existing = await this.getById(input.id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    // 如果设置为默认客户端，先取消其他客户端的默认状态
    if (input.isDefault) {
      await db
        .update(downloadClients)
        .set({ isDefault: false, updatedAt: new Date() });
    }

    const [updated] = await db
      .update(downloadClients)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.username !== undefined && { username: input.username }),
        ...(input.password !== undefined && { password: input.password }),
        ...(input.downloadPath !== undefined && { downloadPath: input.downloadPath }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
        ...(input.requireAuth !== undefined && { requireAuth: input.requireAuth }),
        ...(input.monitorEnabled !== undefined && { monitorEnabled: input.monitorEnabled }),
        ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
        updatedAt: new Date()
      })
      .where(eq(downloadClients.id, input.id))
      .returning();

    return updated;
  }

  // 删除下载客户端
  async delete(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    await db.delete(downloadClients).where(eq(downloadClients.id, id));
    return { success: true };
  }

  // 切换启用状态
  async toggleEnabled(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    const [updated] = await db
      .update(downloadClients)
      .set({
        isEnabled: !existing.isEnabled,
        updatedAt: new Date()
      })
      .where(eq(downloadClients.id, id))
      .returning();

    return updated;
  }

  // 设置为默认客户端
  async setDefault(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    // 取消所有其他客户端的默认状态
    await db
      .update(downloadClients)
      .set({ isDefault: false, updatedAt: new Date() });

    // 设置当前客户端为默认
    const [updated] = await db
      .update(downloadClients)
      .set({
        isDefault: true,
        updatedAt: new Date()
      })
      .where(eq(downloadClients.id, id))
      .returning();

    return updated;
  }

  // ========== API 集成方法 ==========

  // 创建客户端实例
  private createClient(client: typeof downloadClients.$inferSelect) {
    switch (client.type) {
      case "qbittorrent":
        return new QBittorrentClient({
          url: client.url,
          username: client.username ?? undefined,
          password: client.password ?? undefined
        });
      case "transmission":
      case "aria2":
        // TODO: 实现 Transmission/Aria2 客户端
        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message: `${client.type} 客户端尚未实现`
        });
      default:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `不支持的下载客户端类型: ${client.type}`
        });
    }
  }

  // 测试连接
  async testConnection(id: string): Promise<DownloadClientStatus> {
    const client = await this.getById(id);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    try {
      const apiClient = this.createClient(client);
      const status = await apiClient.testConnection();
      return {
        ...status,
        id: client.id,
        name: client.name
      };
    } catch (error) {
      return {
        id: client.id,
        name: client.name,
        type: client.type as DownloadClientType,
        isConnected: false,
        errorMessage: error instanceof Error ? error.message : "连接失败"
      };
    }
  }

  // 获取所有客户端的连接状态
  async getAllStatus(): Promise<DownloadClientStatus[]> {
    const clients = await this.list();
    const statuses: DownloadClientStatus[] = [];

    for (const client of clients) {
      try {
        const status = await this.testConnection(client.id);
        statuses.push(status);
      } catch (error) {
        statuses.push({
          id: client.id,
          name: client.name,
          type: client.type as DownloadClientType,
          isConnected: false,
          errorMessage: error instanceof Error ? error.message : "连接失败"
        });
      }
    }

    return statuses;
  }

  // 获取种子列表
  async getTorrents(id: string, filter?: string, category?: string): Promise<TorrentInfo[]> {
    const client = await this.getById(id);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    const apiClient = this.createClient(client);
    return apiClient.getTorrents(filter, category);
  }

  // 添加种子
  async addTorrent(
    id: string,
    input: {
      urls?: string[];
      torrents?: string[];
      savePath?: string;
      category?: string;
      tags?: string[];
      paused?: boolean;
    }
  ): Promise<void> {
    const client = await this.getById(id);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    const apiClient = this.createClient(client);
    await apiClient.addTorrent(input);
  }

  // 暂停种子
  async pauseTorrents(id: string, hashes: string[]): Promise<void> {
    const client = await this.getById(id);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    const apiClient = this.createClient(client);
    await apiClient.pauseTorrents(hashes);
  }

  // 恢复种子
  async resumeTorrents(id: string, hashes: string[]): Promise<void> {
    const client = await this.getById(id);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    const apiClient = this.createClient(client);
    await apiClient.resumeTorrents(hashes);
  }

  // 删除种子
  async deleteTorrents(id: string, hashes: string[], deleteFiles = false): Promise<void> {
    const client = await this.getById(id);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    const apiClient = this.createClient(client);
    await apiClient.deleteTorrents(hashes, deleteFiles);
  }

  // 获取传输信息
  async getTransferInfo(id: string): Promise<{ dlSpeed: number; upSpeed: number; freeSpace: number }> {
    const client = await this.getById(id);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "下载客户端不存在"
      });
    }

    const apiClient = this.createClient(client);
    return apiClient.getTransferInfo();
  }
}

export const downloadClientService = new DownloadClientService();
