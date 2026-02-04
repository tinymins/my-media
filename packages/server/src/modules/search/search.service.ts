import { db } from "../../db/client";
import { ptSites, mediaServers } from "../../db/schema";
import { eq } from "drizzle-orm";
import { TmdbClient } from "../../lib/tmdb-client";
import { PtSiteClient } from "../../lib/pt-site-client";
import type { PtTorrent, MediaItem, TmdbMedia, SearchResult } from "@acme/types";

/**
 * 搜索服务
 * 聚合搜索 PT 站点、媒体服务器和 TMDB
 */
export class SearchService {
  /**
   * 聚合搜索
   */
  async search(userId: string, keyword: string): Promise<SearchResult> {
    const startTime = Date.now();
    console.log(`[SearchService] Starting search for: "${keyword}"`);

    // 并行搜索所有来源
    const [ptResults, mediaResults, tmdbResults] = await Promise.all([
      this.searchPtSites(userId, keyword),
      this.searchMediaServers(userId, keyword),
      this.searchTmdb(keyword)
    ]);

    const timeTaken = Date.now() - startTime;
    console.log(`[SearchService] Search completed in ${timeTaken}ms, PT: ${ptResults.length}, Media: ${mediaResults.length}, TMDB: ${tmdbResults.length}`);

    return {
      keyword,
      ptResults,
      mediaResults,
      tmdbResults,
      timeTaken
    };
  }

  /**
   * 搜索 PT 站点
   */
  async searchPtSites(userId: string, keyword: string): Promise<PtTorrent[]> {
    console.log(`[SearchService] Searching PT sites for: "${keyword}"`);

    // 获取启用的 PT 站点
    const sites = await db
      .select()
      .from(ptSites)
      .where(eq(ptSites.isEnabled, true));

    console.log(`[SearchService] Found ${sites.length} enabled PT sites`);

    if (sites.length === 0) {
      return [];
    }

    // 并行搜索所有站点
    const allResults: PtTorrent[] = [];

    for (const site of sites) {
      try {
        // 加载站点配置
        const config = PtSiteClient.loadConfigFromFile(site.siteId);

        // 创建客户端
        const client = new PtSiteClient(config, {
          cookies: site.cookies ?? undefined,
          apiKey: site.apiKey ?? undefined
        });

        // 搜索
        const results = await client.search(keyword);
        console.log(`[SearchService] Site ${site.name} returned ${results.length} results`);

        // 转换为 PtTorrent 格式
        for (const result of results) {
          allResults.push({
            id: result.id,
            siteId: site.siteId,
            siteName: site.name,
            title: result.title,
            size: result.size,
            seeders: result.seeders,
            leechers: result.leechers,
            category: result.category || undefined,
            uploadDate: result.uploadTime || undefined,
            downloadUrl: result.downloadUrl || "",
            detailsUrl: result.detailUrl || undefined
          });
        }
      } catch (error) {
        console.error(`[SearchService] Failed to search site ${site.name}:`, error);
      }
    }

    console.log(`[SearchService] Total PT results: ${allResults.length}`);
    return allResults;
  }

  /**
   * 搜索媒体服务器
   */
  async searchMediaServers(userId: string, keyword: string): Promise<MediaItem[]> {
    // 获取启用的媒体服务器
    const servers = await db
      .select()
      .from(mediaServers)
      .where(eq(mediaServers.isEnabled, true));

    if (servers.length === 0) {
      return [];
    }

    // TODO: 实现实际的媒体服务器搜索逻辑
    // 需要调用 Plex/Emby/Jellyfin API
    // 这里返回空数组作为占位
    return [];
  }

  /**
   * 搜索 TMDB
   */
  async searchTmdb(keyword: string): Promise<TmdbMedia[]> {
    // 检查是否配置了 TMDB API Key
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
      return [];
    }

    try {
      const client = new TmdbClient({ apiKey: tmdbApiKey, language: "zh-CN" });
      const results = await client.searchMulti(keyword);
      return results;
    } catch (error) {
      console.error("TMDB search error:", error);
      return [];
    }
  }
}

export const searchService = new SearchService();
