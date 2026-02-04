import { z } from "zod";
import {
  MediaServerStatusSchema,
  DownloadClientStatusSchema,
  SystemStatusSchema
} from "@acme/types";
import { Router, Query, UseMiddlewares } from "../../trpc/decorators";
import { requireUser } from "../../trpc/middlewares";
import { mediaServerService } from "../media-server/media-server.service";
import { downloadClientService } from "../download-client/download-client.service";
import { ptSiteService } from "../pt-site/pt-site.service";
import { adminService } from "../admin/admin.service";

@Router({ alias: "systemStatus" })
export class SystemStatusRouter {
  // 获取完整系统状态
  @Query({ output: SystemStatusSchema })
  @UseMiddlewares(requireUser)
  async getAll() {
    // 并行获取所有状态
    const [mediaServers, downloadClients, ptSitesRaw, systemSettings] = await Promise.all([
      mediaServerService.getAllStatus(),
      downloadClientService.getAllStatus(),
      ptSiteService.list(),
      adminService.getSystemSettings()
    ]);

    // PT 站点状态（目前只检查配置是否正确）
    const ptSites = ptSitesRaw.map((site) => ({
      id: site.id,
      name: site.name,
      siteId: site.siteId,
      isConnected: site.isEnabled && !!(site.cookies || site.apiKey),
      isEnabled: site.isEnabled,
      lastCheckedAt: site.lastCheckedAt?.toISOString() ?? null
    }));

    // TMDB 状态 - 优先使用数据库配置，回退到环境变量
    const tmdbApiKey = systemSettings.tmdbApiKey || process.env.TMDB_API_KEY;
    let tmdbStatus = {
      isConfigured: !!tmdbApiKey,
      isConnected: false,
      errorMessage: tmdbApiKey ? undefined : "未配置 TMDB API Key"
    };

    if (tmdbApiKey) {
      try {
        // 简单的 TMDB 连接测试
        const response = await fetch(
          `https://api.themoviedb.org/3/configuration?api_key=${tmdbApiKey}`
        );
        tmdbStatus.isConnected = response.ok;
        if (!response.ok) {
          tmdbStatus.errorMessage = `API 返回 ${response.status}`;
        }
      } catch (error) {
        tmdbStatus.isConnected = false;
        tmdbStatus.errorMessage = error instanceof Error ? error.message : "连接失败";
      }
    }

    return {
      mediaServers,
      downloadClients,
      ptSites,
      tmdb: tmdbStatus
    };
  }

  // 仅获取媒体服务器状态
  @Query({ output: z.array(MediaServerStatusSchema) })
  @UseMiddlewares(requireUser)
  async getMediaServerStatus() {
    return mediaServerService.getAllStatus();
  }

  // 仅获取下载客户端状态
  @Query({ output: z.array(DownloadClientStatusSchema) })
  @UseMiddlewares(requireUser)
  async getDownloadClientStatus() {
    return downloadClientService.getAllStatus();
  }
}
