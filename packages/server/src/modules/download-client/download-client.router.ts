import { z } from "zod";
import {
  DownloadClientSchema,
  CreateDownloadClientInputSchema,
  UpdateDownloadClientInputSchema,
  DownloadClientStatusSchema,
  TorrentInfoSchema
} from "@acme/types";
import { Router, Query, Mutation, UseMiddlewares } from "../../trpc/decorators";
import { requireUser, requireAdmin } from "../../trpc/middlewares";
import { downloadClientService, toDownloadClientOutput } from "./download-client.service";

@Router({ alias: "downloadClient" })
export class DownloadClientRouter {
  // 获取所有下载客户端列表
  @Query({ output: z.array(DownloadClientSchema) })
  @UseMiddlewares(requireUser)
  async list() {
    const clients = await downloadClientService.list();
    return clients.map(toDownloadClientOutput);
  }

  // 获取单个下载客户端详情
  @Query({
    input: z.object({ id: z.string() }),
    output: DownloadClientSchema.nullable()
  })
  @UseMiddlewares(requireUser)
  async getById(input: { id: string }) {
    const client = await downloadClientService.getById(input.id);
    return client ? toDownloadClientOutput(client) : null;
  }

  // 获取默认下载客户端
  @Query({ output: DownloadClientSchema.nullable() })
  @UseMiddlewares(requireUser)
  async getDefault() {
    const client = await downloadClientService.getDefault();
    return client ? toDownloadClientOutput(client) : null;
  }

  // 创建下载客户端（管理员）
  @Mutation({
    input: CreateDownloadClientInputSchema,
    output: DownloadClientSchema
  })
  @UseMiddlewares(requireAdmin)
  async create(input: z.infer<typeof CreateDownloadClientInputSchema>) {
    const created = await downloadClientService.create(input);
    return toDownloadClientOutput(created);
  }

  // 更新下载客户端（管理员）
  @Mutation({
    input: UpdateDownloadClientInputSchema,
    output: DownloadClientSchema
  })
  @UseMiddlewares(requireAdmin)
  async update(input: z.infer<typeof UpdateDownloadClientInputSchema>) {
    const updated = await downloadClientService.update(input);
    return toDownloadClientOutput(updated);
  }

  // 删除下载客户端（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireAdmin)
  async delete(input: { id: string }) {
    return await downloadClientService.delete(input.id);
  }

  // 切换启用状态（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: DownloadClientSchema
  })
  @UseMiddlewares(requireAdmin)
  async toggleEnabled(input: { id: string }) {
    const updated = await downloadClientService.toggleEnabled(input.id);
    return toDownloadClientOutput(updated);
  }

  // 设置为默认客户端（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: DownloadClientSchema
  })
  @UseMiddlewares(requireAdmin)
  async setDefault(input: { id: string }) {
    const updated = await downloadClientService.setDefault(input.id);
    return toDownloadClientOutput(updated);
  }

  // ========== API 集成端点 ==========

  // 测试连接
  @Query({
    input: z.object({ id: z.string() }),
    output: DownloadClientStatusSchema
  })
  @UseMiddlewares(requireUser)
  async testConnection(input: { id: string }) {
    return downloadClientService.testConnection(input.id);
  }

  // 获取所有客户端状态
  @Query({ output: z.array(DownloadClientStatusSchema) })
  @UseMiddlewares(requireUser)
  async getAllStatus() {
    return downloadClientService.getAllStatus();
  }

  // 获取种子列表
  @Query({
    input: z.object({
      id: z.string(),
      filter: z.string().optional(),
      category: z.string().optional()
    }),
    output: z.array(TorrentInfoSchema)
  })
  @UseMiddlewares(requireUser)
  async getTorrents(input: { id: string; filter?: string; category?: string }) {
    return downloadClientService.getTorrents(input.id, input.filter, input.category);
  }

  // 添加种子
  @Mutation({
    input: z.object({
      id: z.string(),
      urls: z.array(z.string()).optional(),
      torrents: z.array(z.string()).optional(),
      savePath: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      paused: z.boolean().optional()
    }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireUser)
  async addTorrent(input: {
    id: string;
    urls?: string[];
    torrents?: string[];
    savePath?: string;
    category?: string;
    tags?: string[];
    paused?: boolean;
  }) {
    await downloadClientService.addTorrent(input.id, input);
    return { success: true };
  }

  // 暂停种子
  @Mutation({
    input: z.object({ id: z.string(), hashes: z.array(z.string()) }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireUser)
  async pauseTorrents(input: { id: string; hashes: string[] }) {
    await downloadClientService.pauseTorrents(input.id, input.hashes);
    return { success: true };
  }

  // 恢复种子
  @Mutation({
    input: z.object({ id: z.string(), hashes: z.array(z.string()) }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireUser)
  async resumeTorrents(input: { id: string; hashes: string[] }) {
    await downloadClientService.resumeTorrents(input.id, input.hashes);
    return { success: true };
  }

  // 删除种子
  @Mutation({
    input: z.object({
      id: z.string(),
      hashes: z.array(z.string()),
      deleteFiles: z.boolean().optional()
    }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireUser)
  async deleteTorrents(input: { id: string; hashes: string[]; deleteFiles?: boolean }) {
    await downloadClientService.deleteTorrents(input.id, input.hashes, input.deleteFiles);
    return { success: true };
  }

  // 获取传输信息
  @Query({
    input: z.object({ id: z.string() }),
    output: z.object({
      dlSpeed: z.number(),
      upSpeed: z.number(),
      freeSpace: z.number()
    })
  })
  @UseMiddlewares(requireUser)
  async getTransferInfo(input: { id: string }) {
    return downloadClientService.getTransferInfo(input.id);
  }
}
