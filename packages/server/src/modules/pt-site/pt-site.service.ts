import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "../../db/client";
import { ptSites } from "../../db/schema";
import type { CreatePtSiteInput, UpdatePtSiteInput } from "@acme/types";

// 转换数据库实体为 API 输出
export const toPtSiteOutput = (site: typeof ptSites.$inferSelect) => ({
  id: site.id,
  name: site.name,
  siteId: site.siteId,
  domain: site.domain,
  authType: site.authType as "cookies" | "api_key",
  cookies: site.cookies ?? null,
  apiKey: site.apiKey ?? null,
  configYaml: site.configYaml ?? null,
  configUrl: site.configUrl ?? null,
  isEnabled: site.isEnabled,
  lastCheckedAt: site.lastCheckedAt?.toISOString() ?? null,
  createdAt: site.createdAt!.toISOString(),
  updatedAt: site.updatedAt!.toISOString()
});

export class PtSiteService {
  // 获取所有 PT 站点
  async list() {
    const sites = await db
      .select()
      .from(ptSites)
      .orderBy(ptSites.createdAt);
    return sites;
  }

  // 获取启用的 PT 站点
  async listEnabled() {
    const sites = await db
      .select()
      .from(ptSites)
      .where(eq(ptSites.isEnabled, true))
      .orderBy(ptSites.createdAt);
    return sites;
  }

  // 根据 ID 获取单个站点
  async getById(id: string) {
    const [site] = await db
      .select()
      .from(ptSites)
      .where(eq(ptSites.id, id))
      .limit(1);
    return site ?? null;
  }

  // 根据站点标识获取
  async getBySiteId(siteId: string) {
    const [site] = await db
      .select()
      .from(ptSites)
      .where(eq(ptSites.siteId, siteId))
      .limit(1);
    return site ?? null;
  }

  // 创建 PT 站点
  async create(input: CreatePtSiteInput) {
    // 检查站点标识是否已存在
    const existing = await this.getBySiteId(input.siteId);
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `站点标识 "${input.siteId}" 已存在`
      });
    }

    const [created] = await db
      .insert(ptSites)
      .values({
        name: input.name,
        siteId: input.siteId,
        domain: input.domain,
        authType: input.authType,
        cookies: input.cookies,
        apiKey: input.apiKey,
        configYaml: input.configYaml,
        configUrl: input.configUrl,
        isEnabled: input.isEnabled
      })
      .returning();

    return created;
  }

  // 更新 PT 站点
  async update(input: UpdatePtSiteInput) {
    const existing = await this.getById(input.id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "PT 站点不存在"
      });
    }

    const [updated] = await db
      .update(ptSites)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.domain !== undefined && { domain: input.domain }),
        ...(input.authType !== undefined && { authType: input.authType }),
        ...(input.cookies !== undefined && { cookies: input.cookies }),
        ...(input.apiKey !== undefined && { apiKey: input.apiKey }),
        ...(input.configYaml !== undefined && { configYaml: input.configYaml }),
        ...(input.configUrl !== undefined && { configUrl: input.configUrl }),
        ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
        updatedAt: new Date()
      })
      .where(eq(ptSites.id, input.id))
      .returning();

    return updated;
  }

  // 删除 PT 站点
  async delete(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "PT 站点不存在"
      });
    }

    await db.delete(ptSites).where(eq(ptSites.id, id));
    return { success: true };
  }

  // 更新最后检查时间
  async updateLastChecked(id: string) {
    await db
      .update(ptSites)
      .set({
        lastCheckedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(ptSites.id, id));
  }

  // 切换启用状态
  async toggleEnabled(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "PT 站点不存在"
      });
    }

    const [updated] = await db
      .update(ptSites)
      .set({
        isEnabled: !existing.isEnabled,
        updatedAt: new Date()
      })
      .where(eq(ptSites.id, id))
      .returning();

    return updated;
  }
}

export const ptSiteService = new PtSiteService();
