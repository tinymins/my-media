import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "../../db/client";
import { ptSites } from "../../db/schema";
import type { CreatePtSiteInput, UpdatePtSiteInput, PtSiteStatus } from "@acme/types";
import { PtSiteClient, type SiteConfig } from "../../lib/pt-site-client";

// 转换数据库实体为 API 输出
export const toPtSiteOutput = (site: typeof ptSites.$inferSelect) => ({
  id: site.id,
  name: site.name,
  siteId: site.siteId,
  domain: site.domain,
  authType: site.authType as "cookies" | "api_key",
  cookies: site.cookies ?? null,
  apiKey: site.apiKey ?? null,
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

    // 从配置文件获取域名（如果未提供）
    let domain = input.domain;
    if (!domain) {
      const config = this.loadSiteConfig(input.siteId);
      if (config) {
        domain = config.domain;
      }
    }

    if (!domain) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "无法获取站点域名，请检查配置文件"
      });
    }

    const [created] = await db
      .insert(ptSites)
      .values({
        name: input.name,
        siteId: input.siteId,
        domain: domain,
        authType: input.authType,
        cookies: input.cookies,
        apiKey: input.apiKey,
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
        ...(input.siteId !== undefined && { siteId: input.siteId }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.domain && { domain: input.domain }), // 只有非空时才更新
        ...(input.authType !== undefined && { authType: input.authType }),
        ...(input.cookies !== undefined && { cookies: input.cookies }),
        ...(input.apiKey !== undefined && { apiKey: input.apiKey }),
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

  /**
   * 获取所有可用的站点配置（从本地配置目录）
   */
  getAvailableSites() {
    return PtSiteClient.listAvailableSites();
  }

  /**
   * 加载站点配置（根据 siteId 从本地文件加载）
   */
  private loadSiteConfig(siteId: string): SiteConfig | null {
    try {
      return PtSiteClient.loadConfigFromFile(siteId);
    } catch (error) {
      console.error(`Failed to load site config for ${siteId}:`, error);
      return null;
    }
  }

  /**
   * 创建站点客户端
   */
  private createClient(site: typeof ptSites.$inferSelect): PtSiteClient | null {
    const config = this.loadSiteConfig(site.siteId);
    if (!config) {
      return null;
    }

    // 验证认证方式
    const authType = site.authType as "cookies" | "api_key";
    if (!config.allow_auth_type?.includes(authType)) {
      console.warn(`Auth type ${authType} not supported for site ${site.name}`);
    }

    return new PtSiteClient(config, {
      cookies: site.cookies ?? undefined,
      apiKey: site.apiKey ?? undefined
    });
  }

  /**
   * 获取单个站点状态（包含用户信息）
   */
  async getSiteStatus(id: string): Promise<PtSiteStatus> {
    const site = await this.getById(id);
    if (!site) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "PT 站点不存在"
      });
    }

    const result: PtSiteStatus = {
      id: site.id,
      name: site.name,
      siteId: site.siteId,
      isLoggedIn: false,
      userInfo: null,
      lastCheckedAt: site.lastCheckedAt?.toISOString() ?? null
    };

    if (!site.isEnabled) {
      result.errorMessage = "站点已禁用";
      return result;
    }

    const client = this.createClient(site);
    if (!client) {
      result.errorMessage = "缺少站点配置或凭据";
      return result;
    }

    try {
      const userInfo = await client.getUserInfo();
      if (userInfo) {
        result.isLoggedIn = true;
        result.userInfo = userInfo;

        // 更新最后检查时间
        await this.updateLastChecked(site.id);
      } else {
        result.errorMessage = "无法获取用户信息";
      }
    } catch (error) {
      result.errorMessage = error instanceof Error ? error.message : "连接失败";
    }

    return result;
  }

  /**
   * 获取所有站点状态
   */
  async getAllStatus(): Promise<PtSiteStatus[]> {
    const sites = await this.list();
    const results: PtSiteStatus[] = [];

    for (const site of sites) {
      try {
        const status = await this.getSiteStatus(site.id);
        results.push(status);
      } catch {
        results.push({
          id: site.id,
          name: site.name,
          siteId: site.siteId,
          isLoggedIn: false,
          userInfo: null,
          lastCheckedAt: site.lastCheckedAt?.toISOString() ?? null,
          errorMessage: "获取状态失败"
        });
      }
    }

    return results;
  }

  /**
   * 测试站点连接
   */
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const site = await this.getById(id);
    if (!site) {
      return { success: false, message: "站点不存在" };
    }

    const client = this.createClient(site);
    if (!client) {
      return { success: false, message: "缺少站点配置或凭据" };
    }

    try {
      const connected = await client.testConnection();
      if (connected) {
        await this.updateLastChecked(site.id);
        return { success: true, message: "连接成功" };
      }
      return { success: false, message: "连接失败" };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "连接失败"
      };
    }
  }
}

export const ptSiteService = new PtSiteService();
