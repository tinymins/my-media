import { z } from "zod";
import {
  PtSiteSchema,
  CreatePtSiteInputSchema,
  UpdatePtSiteInputSchema,
  PtSiteStatusSchema
} from "@acme/types";
import { Router, Query, Mutation, UseMiddlewares } from "../../trpc/decorators";
import { requireUser, requireAdmin } from "../../trpc/middlewares";
import { ptSiteService, toPtSiteOutput } from "./pt-site.service";

@Router({ alias: "ptSite" })
export class PtSiteRouter {
  // 获取可用的站点配置列表（从本地配置目录）
  @Query({
    output: z.array(z.object({
      id: z.string(),
      name: z.string(),
      domain: z.string(),
      allowAuthType: z.array(z.enum(["cookies", "api_key"]))
    }))
  })
  @UseMiddlewares(requireUser)
  async getAvailableSites() {
    const configs = ptSiteService.getAvailableSites();
    return configs.map(c => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      allowAuthType: c.allow_auth_type
    }));
  }

  // 获取所有 PT 站点列表
  @Query({ output: z.array(PtSiteSchema) })
  @UseMiddlewares(requireUser)
  async list() {
    const sites = await ptSiteService.list();
    return sites.map(toPtSiteOutput);
  }

  // 获取所有站点状态（包含用户信息）
  @Query({ output: z.array(PtSiteStatusSchema) })
  @UseMiddlewares(requireUser)
  async listWithStatus() {
    return await ptSiteService.getAllStatus();
  }

  // 获取单个站点状态
  @Query({
    input: z.object({ id: z.string() }),
    output: PtSiteStatusSchema
  })
  @UseMiddlewares(requireUser)
  async getStatus(input: { id: string }) {
    return await ptSiteService.getSiteStatus(input.id);
  }

  // 测试站点连接
  @Mutation({
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean(), message: z.string() })
  })
  @UseMiddlewares(requireUser)
  async testConnection(input: { id: string }) {
    return await ptSiteService.testConnection(input.id);
  }

  // 获取单个 PT 站点详情
  @Query({
    input: z.object({ id: z.string() }),
    output: PtSiteSchema.nullable()
  })
  @UseMiddlewares(requireUser)
  async getById(input: { id: string }) {
    const site = await ptSiteService.getById(input.id);
    return site ? toPtSiteOutput(site) : null;
  }

  // 创建 PT 站点（管理员）
  @Mutation({
    input: CreatePtSiteInputSchema,
    output: PtSiteSchema
  })
  @UseMiddlewares(requireAdmin)
  async create(input: z.infer<typeof CreatePtSiteInputSchema>) {
    const created = await ptSiteService.create(input);
    return toPtSiteOutput(created);
  }

  // 更新 PT 站点（管理员）
  @Mutation({
    input: UpdatePtSiteInputSchema,
    output: PtSiteSchema
  })
  @UseMiddlewares(requireAdmin)
  async update(input: z.infer<typeof UpdatePtSiteInputSchema>) {
    const updated = await ptSiteService.update(input);
    return toPtSiteOutput(updated);
  }

  // 删除 PT 站点（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() })
  })
  @UseMiddlewares(requireAdmin)
  async delete(input: { id: string }) {
    return await ptSiteService.delete(input.id);
  }

  // 切换启用状态（管理员）
  @Mutation({
    input: z.object({ id: z.string() }),
    output: PtSiteSchema
  })
  @UseMiddlewares(requireAdmin)
  async toggleEnabled(input: { id: string }) {
    const updated = await ptSiteService.toggleEnabled(input.id);
    return toPtSiteOutput(updated);
  }
}
